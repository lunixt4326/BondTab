// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IExpenseModule.sol";
import "./interfaces/IDisputeModule.sol";

/// @title BondTabGroup — Core group contract with vault, balances, and settlement
/// @notice Deployed as a minimal proxy clone via GroupFactory
contract BondTabGroup is Initializable, ReentrancyGuard, Pausable, EIP712 {
    using SafeERC20 for IERC20;

    // ── Roles ───────────────────────────────────────────────────────
    address public admin;
    
    // ── State ───────────────────────────────────────────────────────
    string public name;
    IERC20 public usdc;
    address public reputationRegistry;
    IExpenseModule public expenseModule;
    IDisputeModule public disputeModule;

    // Members
    mapping(address => bool) private _isMember;
    address[] private _memberList;

    // Vault — bond balances per member  
    mapping(address => uint256) public bondBalances;

    // Net balances (int256: positive = group owes them, negative = they owe group)
    mapping(address => int256) public netBalances;

    // Settlement tracking
    mapping(address => uint256) public lastSettlementTime;
    uint256 public lastFinalizationTime;

    // Group parameters
    uint256 public challengeWindowSeconds;
    uint256 public minBondUSDC;
    uint256 public quorumBps; // basis points e.g. 5000 = 50%
    uint256 public settlementGracePeriodSeconds;
    uint256 public slashBps; // basis points e.g. 1000 = 10%
    uint256 public voteWindowSeconds;

    // EIP-712 co-sign support
    bytes32 public constant COSIGN_TYPEHASH = keccak256(
        "CoSignExpense(uint256 expenseId,address cosigner,uint256 nonce,uint256 deadline)"
    );
    mapping(address => uint256) public cosignNonces;

    // ── Events ──────────────────────────────────────────────────────
    event MemberAdded(address indexed member, address indexed addedBy);
    event MemberRemoved(address indexed member, address indexed removedBy);
    event BondDeposited(address indexed member, uint256 amount, uint256 totalBond);
    event BondWithdrawn(address indexed member, uint256 amount, uint256 totalBond);
    event BondSlashed(address indexed member, uint256 amount, address indexed recipient);
    event BalanceUpdated(address indexed member, int256 newBalance);
    event SettlementExecuted(address indexed debtor, address indexed creditor, uint256 amount);
    event BondEnforced(address indexed debtor, address indexed creditor, uint256 amount);
    event GroupPaused(address indexed by);
    event GroupUnpaused(address indexed by);

    // ── Custom Errors ───────────────────────────────────────────────
    error NotAdmin();
    error NotMember();
    error NotModule();
    error AlreadyMember();
    error NotAlreadyMember();
    error InsufficientBond();
    error HasNegativeBalance();
    error HasActiveDisputes();
    error AmountZero();
    error BondBelowMinimum();
    error ArrayLengthMismatch();
    error SettlementNotOverdue();
    error InsufficientBondForEnforcement();
    error InvalidSignature();
    error SignatureExpired();

    // ── Modifiers ───────────────────────────────────────────────────
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyMember() {
        if (!_isMember[msg.sender]) revert NotMember();
        _;
    }

    modifier onlyModule() {
        if (msg.sender != address(expenseModule) && msg.sender != address(disputeModule))
            revert NotModule();
        _;
    }

    // ── Constructor (for EIP712 domain) ─────────────────────────────
    constructor() EIP712("BondTab", "1") {
        _disableInitializers();
    }

    // ── Initialization ──────────────────────────────────────────────
    function initialize(
        string calldata _name,
        address _usdc,
        address[] calldata _initMembers,
        uint256 _challengeWindowSeconds,
        uint256 _minBondUSDC,
        uint256 _quorumBps,
        uint256 _settlementGracePeriodSeconds,
        uint256 _slashBps,
        uint256 _voteWindowSeconds,
        address _expenseModule,
        address _disputeModule,
        address _reputationRegistry,
        address _admin
    ) external initializer {
        name = _name;
        usdc = IERC20(_usdc);
        challengeWindowSeconds = _challengeWindowSeconds;
        minBondUSDC = _minBondUSDC;
        quorumBps = _quorumBps;
        settlementGracePeriodSeconds = _settlementGracePeriodSeconds;
        slashBps = _slashBps;
        voteWindowSeconds = _voteWindowSeconds;
        expenseModule = IExpenseModule(_expenseModule);
        disputeModule = IDisputeModule(_disputeModule);
        reputationRegistry = _reputationRegistry;
        admin = _admin;

        // Add initial members
        for (uint256 i = 0; i < _initMembers.length; i++) {
            _isMember[_initMembers[i]] = true;
            _memberList.push(_initMembers[i]);
            emit MemberAdded(_initMembers[i], _admin);
        }
        // Admin is always a member
        if (!_isMember[_admin]) {
            _isMember[_admin] = true;
            _memberList.push(_admin);
        }
    }

    // ── Membership Management ───────────────────────────────────────

    function addMember(address member) external onlyAdmin whenNotPaused {
        if (_isMember[member]) revert AlreadyMember();
        _isMember[member] = true;
        _memberList.push(member);
        emit MemberAdded(member, msg.sender);
    }

    function removeMember(address member) external onlyAdmin whenNotPaused {
        if (!_isMember[member]) revert NotAlreadyMember();
        if (netBalances[member] < 0) revert HasNegativeBalance();
        _isMember[member] = false;
        // Remove from array
        for (uint256 i = 0; i < _memberList.length; i++) {
            if (_memberList[i] == member) {
                _memberList[i] = _memberList[_memberList.length - 1];
                _memberList.pop();
                break;
            }
        }
        // Return any remaining bond
        uint256 bond = bondBalances[member];
        if (bond > 0) {
            bondBalances[member] = 0;
            usdc.safeTransfer(member, bond);
        }
        emit MemberRemoved(member, msg.sender);
    }

    function isMember(address account) external view returns (bool) {
        return _isMember[account];
    }

    function hasBond(address account) external view returns (bool) {
        return bondBalances[account] >= minBondUSDC;
    }

    function memberCount() external view returns (uint256) {
        return _memberList.length;
    }

    function getMemberAt(uint256 index) external view returns (address) {
        return _memberList[index];
    }

    function getMembers() external view returns (address[] memory) {
        return _memberList;
    }

    // ── Vault (Bond Management) ─────────────────────────────────────

    function depositBond(uint256 amount) external onlyMember nonReentrant whenNotPaused {
        if (amount == 0) revert AmountZero();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        bondBalances[msg.sender] += amount;
        emit BondDeposited(msg.sender, amount, bondBalances[msg.sender]);
    }

    function withdrawBond(uint256 amount) external onlyMember nonReentrant whenNotPaused {
        if (amount == 0) revert AmountZero();
        if (bondBalances[msg.sender] < amount) revert InsufficientBond();
        
        // Cannot withdraw if negative balance
        if (netBalances[msg.sender] < 0) revert HasNegativeBalance();
        
        // Ensure remaining bond >= minBondUSDC (or withdrawing all and leaving)
        uint256 remaining = bondBalances[msg.sender] - amount;
        if (remaining > 0 && remaining < minBondUSDC) revert BondBelowMinimum();

        bondBalances[msg.sender] = remaining;
        usdc.safeTransfer(msg.sender, amount);
        emit BondWithdrawn(msg.sender, amount, remaining);
    }

    function getBondBalance(address account) external view returns (uint256) {
        return bondBalances[account];
    }

    // ── Balance Management (called by modules) ──────────────────────

    function updateBalance(address member, int256 delta) external onlyModule {
        netBalances[member] += delta;
        emit BalanceUpdated(member, netBalances[member]);
    }

    function getNetBalance(address account) external view returns (int256) {
        return netBalances[account];
    }

    /// @notice Slash a member's bond and send to recipient
    function slashBond(
        address member,
        uint256 amount,
        address recipient
    ) external onlyModule nonReentrant {
        if (bondBalances[member] < amount) {
            amount = bondBalances[member]; // Slash up to available
        }
        bondBalances[member] -= amount;
        usdc.safeTransfer(recipient, amount);
        emit BondSlashed(member, amount, recipient);
    }

    // ── Settlement ──────────────────────────────────────────────────

    /// @notice Execute a batch settlement between debtors and creditors
    function settleBatch(
        address[] calldata debtors,
        address[] calldata creditors,
        uint256[] calldata amounts
    ) external onlyMember nonReentrant whenNotPaused {
        if (debtors.length != creditors.length || debtors.length != amounts.length)
            revert ArrayLengthMismatch();

        for (uint256 i = 0; i < debtors.length; i++) {
            address debtor = debtors[i];
            address creditor = creditors[i];
            uint256 amount = amounts[i];

            if (amount == 0) revert AmountZero();

            // Transfer USDC from debtor to creditor (debtor must have approved this contract)
            usdc.safeTransferFrom(debtor, creditor, amount);

            // Update net balances
            netBalances[debtor] += int256(amount);
            netBalances[creditor] -= int256(amount);

            lastSettlementTime[debtor] = block.timestamp;

            emit SettlementExecuted(debtor, creditor, amount);
            emit BalanceUpdated(debtor, netBalances[debtor]);
            emit BalanceUpdated(creditor, netBalances[creditor]);
        }
    }

    /// @notice Enforce settlement from a member's bond if overdue
    function settleFromBond(
        address debtor,
        address creditor,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        // Check debtor actually owes
        if (netBalances[debtor] >= 0) revert HasNegativeBalance();
        
        // Check settlement is overdue
        uint256 lastActivity = lastSettlementTime[debtor];
        if (lastActivity == 0) lastActivity = lastFinalizationTime;
        if (block.timestamp < lastActivity + settlementGracePeriodSeconds) 
            revert SettlementNotOverdue();

        // Only enforce up to what they owe
        uint256 owed = uint256(-netBalances[debtor]);
        if (amount > owed) amount = owed;
        
        if (bondBalances[debtor] < amount) revert InsufficientBondForEnforcement();

        bondBalances[debtor] -= amount;
        usdc.safeTransfer(creditor, amount);

        netBalances[debtor] += int256(amount);
        netBalances[creditor] -= int256(amount);

        emit BondEnforced(debtor, creditor, amount);
        emit BalanceUpdated(debtor, netBalances[debtor]);
        emit BalanceUpdated(creditor, netBalances[creditor]);
    }

    /// @notice Update last finalization time (called by expense module)
    function recordFinalization() external onlyModule {
        lastFinalizationTime = block.timestamp;
    }

    // ── Parameters ──────────────────────────────────────────────────

    function getParams() external view returns (
        uint256, uint256, uint256, uint256, uint256, uint256
    ) {
        return (
            challengeWindowSeconds,
            minBondUSDC,
            quorumBps,
            settlementGracePeriodSeconds,
            slashBps,
            voteWindowSeconds
        );
    }

    function updateParams(
        uint256 _challengeWindowSeconds,
        uint256 _minBondUSDC,
        uint256 _quorumBps,
        uint256 _settlementGracePeriodSeconds,
        uint256 _slashBps,
        uint256 _voteWindowSeconds
    ) external onlyAdmin {
        challengeWindowSeconds = _challengeWindowSeconds;
        minBondUSDC = _minBondUSDC;
        quorumBps = _quorumBps;
        settlementGracePeriodSeconds = _settlementGracePeriodSeconds;
        slashBps = _slashBps;
        voteWindowSeconds = _voteWindowSeconds;
    }

    // ── EIP-712 Co-sign Support ─────────────────────────────────────

    function verifyCosignature(
        uint256 expenseId,
        address cosigner,
        uint256 deadline,
        bytes calldata signature
    ) external view returns (bool) {
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 structHash = keccak256(abi.encode(
            COSIGN_TYPEHASH,
            expenseId,
            cosigner,
            cosignNonces[cosigner],
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != cosigner) revert InvalidSignature();
        return true;
    }

    // ── Pausability ─────────────────────────────────────────────────

    function pause() external onlyAdmin {
        _pause();
        emit GroupPaused(msg.sender);
    }

    function unpause() external onlyAdmin {
        _unpause();
        emit GroupUnpaused(msg.sender);
    }
}
