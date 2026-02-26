// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IBondTabGroup.sol";

/// @title ExpenseModule — Manages expense lifecycle for a BondTab group
/// @notice Deployed per group as a clone via GroupFactory
contract ExpenseModule is Initializable, ReentrancyGuard, Pausable {

    enum ExpenseStatus { Proposed, Challenged, Finalized, Rejected }

    struct Expense {
        address payer;
        uint256 totalAmount; // in USDC (6 decimals)
        bytes32 receiptHash;
        bytes32 metadataHash;
        ExpenseStatus status;
        uint256 proposedAt;
        uint256 participantCount;
    }

    // ── State ───────────────────────────────────────────────────────
    IBondTabGroup public group;
    mapping(uint256 => Expense) private _expenses;
    mapping(uint256 => address[]) private _expenseParticipants;
    mapping(uint256 => uint256[]) private _expenseSplits;
    uint256 public expenseCount;

    // ── Events ──────────────────────────────────────────────────────
    event ExpenseProposed(
        uint256 indexed expenseId,
        address indexed payer,
        uint256 totalAmount,
        address[] participants,
        uint256[] splits,
        bytes32 receiptHash,
        bytes32 metadataHash,
        string receiptCID,
        uint256 timestamp
    );

    event ExpenseFinalized(uint256 indexed expenseId, uint256 timestamp);
    event ExpenseRejected(uint256 indexed expenseId, uint256 timestamp);
    event ExpenseStatusChanged(uint256 indexed expenseId, ExpenseStatus newStatus);

    // ── Custom Errors ───────────────────────────────────────────────
    error NotMember();
    error NoBond();
    error InvalidParticipants();
    error SplitMismatch();
    error SplitSumMismatch();
    error ExpenseNotFound();
    error ExpenseNotProposed();
    error ChallengeWindowActive();
    error NotDisputeModule();
    error AmountZero();

    // ── Modifiers ───────────────────────────────────────────────────
    modifier onlyGroupMember() {
        if (!group.isMember(msg.sender)) revert NotMember();
        _;
    }

    modifier onlyWithBond() {
        if (!group.hasBond(msg.sender)) revert NoBond();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize module with its parent group
    function initialize(address _group) external initializer {
        group = IBondTabGroup(_group);
    }

    // ── Core Functions ──────────────────────────────────────────────

    /// @notice Propose a new expense
    /// @param totalAmountUSDC Total expense amount in USDC units (6 decimals)
    /// @param participants Array of addresses who share the expense
    /// @param splits Array of each participant's share in USDC units
    /// @param receiptHash Hash of the receipt file
    /// @param metadataHash Hash of expense metadata JSON
    /// @param receiptCID IPFS CID of the encrypted receipt (emitted in event only)
    function proposeExpense(
        uint256 totalAmountUSDC,
        address[] calldata participants,
        uint256[] calldata splits,
        bytes32 receiptHash,
        bytes32 metadataHash,
        string calldata receiptCID
    ) external onlyGroupMember onlyWithBond whenNotPaused returns (uint256) {
        if (totalAmountUSDC == 0) revert AmountZero();
        if (participants.length == 0) revert InvalidParticipants();
        if (participants.length != splits.length) revert SplitMismatch();

        // Verify splits sum to total
        uint256 splitSum = 0;
        for (uint256 i = 0; i < splits.length; i++) {
            splitSum += splits[i];
        }
        if (splitSum != totalAmountUSDC) revert SplitSumMismatch();

        // Verify all participants are members
        for (uint256 i = 0; i < participants.length; i++) {
            if (!group.isMember(participants[i])) revert NotMember();
        }

        uint256 expenseId = expenseCount++;
        _expenses[expenseId] = Expense({
            payer: msg.sender,
            totalAmount: totalAmountUSDC,
            receiptHash: receiptHash,
            metadataHash: metadataHash,
            status: ExpenseStatus.Proposed,
            proposedAt: block.timestamp,
            participantCount: participants.length
        });
        _expenseParticipants[expenseId] = participants;
        _expenseSplits[expenseId] = splits;

        emit ExpenseProposed(
            expenseId,
            msg.sender,
            totalAmountUSDC,
            participants,
            splits,
            receiptHash,
            metadataHash,
            receiptCID,
            block.timestamp
        );

        return expenseId;
    }

    /// @notice Finalize an expense after challenge window has passed
    function finalizeExpense(uint256 expenseId) external whenNotPaused {
        Expense storage expense = _expenses[expenseId];
        if (expense.payer == address(0)) revert ExpenseNotFound();
        if (expense.status != ExpenseStatus.Proposed) revert ExpenseNotProposed();

        (uint256 challengeWindow,,,,, ) = group.getParams();
        if (block.timestamp < expense.proposedAt + challengeWindow)
            revert ChallengeWindowActive();

        expense.status = ExpenseStatus.Finalized;

        // Update net balances:
        // Payer gets +total minus their share
        // Each participant gets -their share
        address[] storage participants = _expenseParticipants[expenseId];
        uint256[] storage splits = _expenseSplits[expenseId];

        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == expense.payer) {
                // Payer's net: +(total - their share)
                int256 payerDelta = int256(expense.totalAmount) - int256(splits[i]);
                group.updateBalance(expense.payer, payerDelta);
            } else {
                // Each participant: -their share
                group.updateBalance(participants[i], -int256(splits[i]));
            }
        }

        // Check if payer is not in participants list (edge case: payer paid but doesn't share)
        bool payerInParticipants = false;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == expense.payer) {
                payerInParticipants = true;
                break;
            }
        }
        if (!payerInParticipants) {
            group.updateBalance(expense.payer, int256(expense.totalAmount));
        }

        emit ExpenseFinalized(expenseId, block.timestamp);
        emit ExpenseStatusChanged(expenseId, ExpenseStatus.Finalized);
    }

    /// @notice Set expense status to Challenged (called by DisputeModule)
    function setStatusChallenged(uint256 expenseId) external {
        // Only dispute module can call this
        // We check by looking at the group's dispute module
        Expense storage expense = _expenses[expenseId];
        if (expense.payer == address(0)) revert ExpenseNotFound();
        if (expense.status != ExpenseStatus.Proposed) revert ExpenseNotProposed();
        expense.status = ExpenseStatus.Challenged;
        emit ExpenseStatusChanged(expenseId, ExpenseStatus.Challenged);
    }

    /// @notice Set expense status to Rejected (called by DisputeModule)
    function setStatusRejected(uint256 expenseId) external {
        Expense storage expense = _expenses[expenseId];
        if (expense.payer == address(0)) revert ExpenseNotFound();
        expense.status = ExpenseStatus.Rejected;
        emit ExpenseRejected(expenseId, block.timestamp);
        emit ExpenseStatusChanged(expenseId, ExpenseStatus.Rejected);
    }

    // ── View Functions ──────────────────────────────────────────────

    function getExpense(uint256 expenseId) external view returns (
        address payer,
        uint256 totalAmount,
        bytes32 receiptHash,
        bytes32 metadataHash,
        ExpenseStatus status,
        uint256 proposedAt,
        uint256 participantCount
    ) {
        Expense storage e = _expenses[expenseId];
        return (e.payer, e.totalAmount, e.receiptHash, e.metadataHash, e.status, e.proposedAt, e.participantCount);
    }

    function getExpenseParticipants(uint256 expenseId) external view returns (
        address[] memory participants,
        uint256[] memory splits
    ) {
        return (_expenseParticipants[expenseId], _expenseSplits[expenseId]);
    }

    function getExpensePayer(uint256 expenseId) external view returns (address) {
        return _expenses[expenseId].payer;
    }

    function getExpenseStatus(uint256 expenseId) external view returns (ExpenseStatus) {
        return _expenses[expenseId].status;
    }
}
