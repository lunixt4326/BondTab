// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BondTabGroup.sol";
import "./ExpenseModule.sol";
import "./DisputeModule.sol";

/// @title GroupFactory — Deploys new BondTab groups using minimal proxy pattern
/// @notice Creates clone instances of BondTabGroup, ExpenseModule, and DisputeModule
contract GroupFactory is AccessControl, Pausable {
    using Clones for address;

    address public groupImplementation;
    address public expenseImplementation;
    address public disputeImplementation;
    address public usdcAddress;
    address public reputationRegistry;

    address[] public allGroups;
    mapping(address => address[]) public memberGroups;

    // ── Events ──────────────────────────────────────────────────────
    event GroupCreated(
        address indexed groupAddress,
        address indexed expenseModule,
        address indexed disputeModule,
        string name,
        address creator,
        address[] members,
        uint256 timestamp
    );

    // ── Custom Errors ───────────────────────────────────────────────
    error ZeroAddress();
    error NoMembers();
    error InvalidParams();

    constructor(
        address _groupImpl,
        address _expenseImpl,
        address _disputeImpl,
        address _usdc,
        address _reputationRegistry
    ) {
        if (_groupImpl == address(0) || _expenseImpl == address(0) ||
            _disputeImpl == address(0) || _usdc == address(0))
            revert ZeroAddress();

        groupImplementation = _groupImpl;
        expenseImplementation = _expenseImpl;
        disputeImplementation = _disputeImpl;
        usdcAddress = _usdc;
        reputationRegistry = _reputationRegistry;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Create a new BondTab group
    /// @param _name Group name
    /// @param _members Initial member addresses
    /// @param _challengeWindowSeconds Time window for challenging expenses
    /// @param _minBondUSDC Minimum bond in USDC (6 decimals)
    /// @param _quorumBps Quorum percentage in basis points (e.g. 5000 = 50%)
    /// @param _settlementGracePeriodSeconds Grace period before bond enforcement
    /// @param _slashBps Slash percentage in basis points (e.g. 1000 = 10%)
    /// @param _voteWindowSeconds Time window for voting on disputes
    function createGroup(
        string calldata _name,
        address[] calldata _members,
        uint256 _challengeWindowSeconds,
        uint256 _minBondUSDC,
        uint256 _quorumBps,
        uint256 _settlementGracePeriodSeconds,
        uint256 _slashBps,
        uint256 _voteWindowSeconds
    ) external whenNotPaused returns (address groupAddr, address expenseAddr, address disputeAddr) {
        if (_members.length == 0) revert NoMembers();
        if (_challengeWindowSeconds == 0 || _minBondUSDC == 0 || _quorumBps == 0)
            revert InvalidParams();

        // Deploy clones
        groupAddr = groupImplementation.clone();
        expenseAddr = expenseImplementation.clone();
        disputeAddr = disputeImplementation.clone();

        // Initialize expense module
        ExpenseModule(expenseAddr).initialize(groupAddr);

        // Initialize dispute module
        DisputeModule(disputeAddr).initialize(groupAddr, expenseAddr);

        // Initialize group
        BondTabGroup(groupAddr).initialize(
            _name,
            usdcAddress,
            _members,
            _challengeWindowSeconds,
            _minBondUSDC,
            _quorumBps,
            _settlementGracePeriodSeconds,
            _slashBps,
            _voteWindowSeconds,
            expenseAddr,
            disputeAddr,
            reputationRegistry,
            msg.sender
        );

        // Register in factory state
        allGroups.push(groupAddr);

        // Register group in reputation registry
        if (reputationRegistry != address(0)) {
            (bool success,) = reputationRegistry.call(
                abi.encodeWithSignature("registerGroup(address)", groupAddr)
            );
            // Continue even if registration fails
            success;
        }

        // Track membership
        for (uint256 i = 0; i < _members.length; i++) {
            memberGroups[_members[i]].push(groupAddr);
        }
        // Creator is also a member
        bool creatorInList = false;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i] == msg.sender) {
                creatorInList = true;
                break;
            }
        }
        if (!creatorInList) {
            memberGroups[msg.sender].push(groupAddr);
        }

        emit GroupCreated(groupAddr, expenseAddr, disputeAddr, _name, msg.sender, _members, block.timestamp);
    }

    // ── View Functions ──────────────────────────────────────────────

    function getGroups() external view returns (address[] memory) {
        return allGroups;
    }

    function getGroupCount() external view returns (uint256) {
        return allGroups.length;
    }

    function getGroupsByMember(address member) external view returns (address[] memory) {
        return memberGroups[member];
    }

    // ── Admin ───────────────────────────────────────────────────────

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function updateImplementations(
        address _groupImpl,
        address _expenseImpl,
        address _disputeImpl
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_groupImpl != address(0)) groupImplementation = _groupImpl;
        if (_expenseImpl != address(0)) expenseImplementation = _expenseImpl;
        if (_disputeImpl != address(0)) disputeImplementation = _disputeImpl;
    }
}
