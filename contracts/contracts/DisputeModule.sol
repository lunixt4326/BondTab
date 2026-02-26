// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IBondTabGroup.sol";
import "./interfaces/IExpenseModule.sol";

/// @title DisputeModule — Handles expense challenges, voting, and resolution
/// @notice Deployed per group as a clone via GroupFactory
contract DisputeModule is Initializable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct Dispute {
        address challenger;
        uint8 reasonCode;
        bytes32 evidenceHash;
        uint256 challengedAt;
        uint256 votesFor;       // votes to uphold expense
        uint256 votesAgainst;   // votes to reject expense
        bool resolved;
        uint256 challengerBond;
    }

    // ── State ───────────────────────────────────────────────────────
    IBondTabGroup public group;
    IExpenseModule public expenseModule;

    uint256 public constant CHALLENGER_BOND_USDC = 5_000000; // 5 USDC (6 decimals)

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteDirection; // true = support expense

    // ── Events ──────────────────────────────────────────────────────
    event ExpenseChallenged(
        uint256 indexed expenseId,
        address indexed challenger,
        uint8 reasonCode,
        bytes32 evidenceHash,
        uint256 timestamp
    );
    event VoteCast(
        uint256 indexed expenseId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst
    );
    event DisputeResolved(
        uint256 indexed expenseId,
        bool expenseUpheld,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 timestamp
    );

    // ── Custom Errors ───────────────────────────────────────────────
    error NotMember();
    error NoBond();
    error AlreadyChallenged();
    error NotInChallengeWindow();
    error AlreadyVoted();
    error VoteWindowExpired();
    error VoteWindowActive();
    error DisputeNotFound();
    error DisputeAlreadyResolved();
    error CannotChallengeOwnExpense();
    error QuorumNotReached();
    error ExpenseNotProposed();

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

    /// @notice Initialize with parent group and expense module
    function initialize(address _group, address _expenseModule) external initializer {
        group = IBondTabGroup(_group);
        expenseModule = IExpenseModule(_expenseModule);
    }

    // ── Core Functions ──────────────────────────────────────────────

    /// @notice Challenge an expense within the challenge window
    /// @param expenseId The expense to challenge
    /// @param reasonCode A code indicating the reason (1=inflated, 2=fake, 3=duplicate, 4=wrong_split, 5=other)
    /// @param evidenceHash Hash of challenger's evidence
    function challengeExpense(
        uint256 expenseId,
        uint8 reasonCode,
        bytes32 evidenceHash
    ) external onlyGroupMember onlyWithBond nonReentrant whenNotPaused {
        // Get expense details
        (address payer,,,,IExpenseModule.ExpenseStatus status, uint256 proposedAt,) =
            expenseModule.getExpense(expenseId);

        if (status != IExpenseModule.ExpenseStatus.Proposed) revert ExpenseNotProposed();
        if (msg.sender == payer) revert CannotChallengeOwnExpense();
        if (disputes[expenseId].challenger != address(0)) revert AlreadyChallenged();

        // Check within challenge window
        (uint256 challengeWindow,,,,, ) = group.getParams();
        if (block.timestamp > proposedAt + challengeWindow) revert NotInChallengeWindow();

        // Collect challenger bond
        IERC20 usdc = IERC20(group.usdc());
        usdc.safeTransferFrom(msg.sender, address(this), CHALLENGER_BOND_USDC);

        disputes[expenseId] = Dispute({
            challenger: msg.sender,
            reasonCode: reasonCode,
            evidenceHash: evidenceHash,
            challengedAt: block.timestamp,
            votesFor: 0,
            votesAgainst: 0,
            resolved: false,
            challengerBond: CHALLENGER_BOND_USDC
        });

        // Update expense status
        expenseModule.setStatusChallenged(expenseId);

        emit ExpenseChallenged(expenseId, msg.sender, reasonCode, evidenceHash, block.timestamp);
    }

    /// @notice Vote on a disputed expense
    /// @param expenseId The disputed expense
    /// @param support True to uphold the expense, false to reject it
    function voteOnDispute(
        uint256 expenseId,
        bool support
    ) external onlyGroupMember onlyWithBond whenNotPaused {
        Dispute storage d = disputes[expenseId];
        if (d.challenger == address(0)) revert DisputeNotFound();
        if (d.resolved) revert DisputeAlreadyResolved();
        if (hasVoted[expenseId][msg.sender]) revert AlreadyVoted();

        // Check vote window
        (,,,,, uint256 voteWindow) = group.getParams();
        if (block.timestamp > d.challengedAt + voteWindow) revert VoteWindowExpired();

        hasVoted[expenseId][msg.sender] = true;
        voteDirection[expenseId][msg.sender] = support;

        if (support) {
            d.votesFor++;
        } else {
            d.votesAgainst++;
        }

        emit VoteCast(expenseId, msg.sender, support, d.votesFor, d.votesAgainst);
    }

    /// @notice Resolve a dispute after vote window expires
    function resolveDispute(uint256 expenseId) external nonReentrant whenNotPaused {
        Dispute storage d = disputes[expenseId];
        if (d.challenger == address(0)) revert DisputeNotFound();
        if (d.resolved) revert DisputeAlreadyResolved();

        // Ensure vote window has ended
        (,,uint256 quorumBps,,uint256 slashBps, uint256 voteWindow) = group.getParams();
        if (block.timestamp < d.challengedAt + voteWindow) revert VoteWindowActive();

        uint256 totalVotes = d.votesFor + d.votesAgainst;
        uint256 totalMembers = group.memberCount();

        // Check quorum
        if (totalMembers > 0 && (totalVotes * 10000) / totalMembers < quorumBps)
            revert QuorumNotReached();

        d.resolved = true;

        IERC20 usdc = IERC20(group.usdc());
        (address payer,,,,,,) = expenseModule.getExpense(expenseId);

        bool expenseUpheld = d.votesFor >= d.votesAgainst;

        if (expenseUpheld) {
            // Expense upheld — finalize it
            // Return challenger bond to group pool (small penalty for frivolous challenge)
            // Slash a portion of challenger bond
            uint256 challengerSlash = (d.challengerBond * slashBps) / 10000;
            uint256 returnAmount = d.challengerBond - challengerSlash;

            if (returnAmount > 0) {
                usdc.safeTransfer(d.challenger, returnAmount);
            }
            // Slashed portion goes to expense payer as compensation
            if (challengerSlash > 0) {
                usdc.safeTransfer(payer, challengerSlash);
            }

            // Finalize the expense — update balances
            _finalizeDisputedExpense(expenseId);

            // Record reputation
            address repRegistry = group.reputationRegistry();
            if (repRegistry != address(0)) {
                (bool s1,) = repRegistry.call(
                    abi.encodeWithSignature("recordDisputeResult(address,bool)", d.challenger, false)
                );
                (bool s2,) = repRegistry.call(
                    abi.encodeWithSignature("recordDisputeResult(address,bool)", payer, true)
                );
                // Silently handle if registry call fails
                s1; s2;
            }
        } else {
            // Expense rejected — slash submitter, reward challenger
            uint256 slashAmount = (group.getBondBalance(payer) * slashBps) / 10000;

            // Slash payer's bond
            if (slashAmount > 0) {
                group.slashBond(payer, slashAmount, d.challenger);
            }

            // Return challenger bond
            usdc.safeTransfer(d.challenger, d.challengerBond);

            // Reject the expense
            expenseModule.setStatusRejected(expenseId);

            // Record reputation
            address repRegistry = group.reputationRegistry();
            if (repRegistry != address(0)) {
                (bool s1,) = repRegistry.call(
                    abi.encodeWithSignature("recordDisputeResult(address,bool)", d.challenger, true)
                );
                (bool s2,) = repRegistry.call(
                    abi.encodeWithSignature("recordDisputeResult(address,bool)", payer, false)
                );
                s1; s2;
            }
        }

        emit DisputeResolved(expenseId, expenseUpheld, d.votesFor, d.votesAgainst, block.timestamp);
    }

    // ── Internal ────────────────────────────────────────────────────

    function _finalizeDisputedExpense(uint256 expenseId) internal {
        (address payer, uint256 totalAmount,,,,, ) = expenseModule.getExpense(expenseId);
        (address[] memory participants, uint256[] memory splits) =
            expenseModule.getExpenseParticipants(expenseId);

        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == payer) {
                int256 payerDelta = int256(totalAmount) - int256(splits[i]);
                group.updateBalance(payer, payerDelta);
            } else {
                group.updateBalance(participants[i], -int256(splits[i]));
            }
        }

        // Check if payer is not in participants
        bool payerInParticipants = false;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == payer) {
                payerInParticipants = true;
                break;
            }
        }
        if (!payerInParticipants) {
            group.updateBalance(payer, int256(totalAmount));
        }
    }

    // ── View Functions ──────────────────────────────────────────────

    function getDispute(uint256 expenseId) external view returns (
        address challenger,
        uint8 reasonCode,
        bytes32 evidenceHash,
        uint256 challengedAt,
        uint256 votesFor,
        uint256 votesAgainst,
        bool resolved,
        uint256 challengerBond
    ) {
        Dispute storage d = disputes[expenseId];
        return (
            d.challenger,
            d.reasonCode,
            d.evidenceHash,
            d.challengedAt,
            d.votesFor,
            d.votesAgainst,
            d.resolved,
            d.challengerBond
        );
    }

    function hasUserVoted(uint256 expenseId, address voter) external view returns (bool) {
        return hasVoted[expenseId][voter];
    }

    function getUserVote(uint256 expenseId, address voter) external view returns (bool) {
        return voteDirection[expenseId][voter];
    }
}
