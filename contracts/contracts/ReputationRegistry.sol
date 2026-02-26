// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title ReputationRegistry — Onchain reputation tracking for BondTab members
/// @notice Deployed once, shared across all BondTab groups
contract ReputationRegistry is AccessControl, Pausable {
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");
    bytes32 public constant GROUP_ROLE = keccak256("GROUP_ROLE");

    struct Stats {
        uint64 onTimeSettlements;
        uint64 lateSettlements;
        uint64 disputesLost;
        uint64 disputesWon;
        uint256 volumeSettled;
        uint256 totalSettleTime;
        uint64 settleCount;
    }

    mapping(address => Stats) private _stats;
    mapping(address => bool) public registeredGroups;

    // ── Events ──────────────────────────────────────────────────────
    event GroupRegistered(address indexed group);
    event ReputationUpdated(address indexed member, string action);

    // ── Custom Errors ───────────────────────────────────────────────
    error NotRegisteredGroup();
    error GroupAlreadyRegistered();
    error ZeroAddress();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACTORY_ROLE, msg.sender);
    }

    // ── Factory Functions ───────────────────────────────────────────

    /// @notice Register a new group contract that can update reputation
    /// @param group Address of the deployed group contract
    function registerGroup(address group) external onlyRole(FACTORY_ROLE) {
        if (group == address(0)) revert ZeroAddress();
        if (registeredGroups[group]) revert GroupAlreadyRegistered();
        registeredGroups[group] = true;
        _grantRole(GROUP_ROLE, group);
        emit GroupRegistered(group);
    }

    // ── Group Functions ─────────────────────────────────────────────

    /// @notice Record a settlement event for a member
    function recordSettlement(
        address member,
        uint256 amount,
        bool isOnTime,
        uint256 settleTimeSec
    ) external onlyRole(GROUP_ROLE) whenNotPaused {
        Stats storage s = _stats[member];
        if (isOnTime) {
            s.onTimeSettlements++;
        } else {
            s.lateSettlements++;
        }
        s.volumeSettled += amount;
        s.totalSettleTime += settleTimeSec;
        s.settleCount++;
        emit ReputationUpdated(member, isOnTime ? "onTimeSettle" : "lateSettle");
    }

    /// @notice Record dispute outcome
    function recordDisputeResult(
        address member,
        bool won
    ) external onlyRole(GROUP_ROLE) whenNotPaused {
        Stats storage s = _stats[member];
        if (won) {
            s.disputesWon++;
        } else {
            s.disputesLost++;
        }
        emit ReputationUpdated(member, won ? "disputeWon" : "disputeLost");
    }

    // ── View Functions ──────────────────────────────────────────────

    /// @notice Get full reputation stats for a member
    function getReputation(address member) external view returns (
        uint64 onTimeSettlements,
        uint64 lateSettlements,
        uint64 disputesLost,
        uint64 disputesWon,
        uint256 volumeSettled,
        uint256 avgSettleTimeSec,
        uint64 settleCount
    ) {
        Stats storage s = _stats[member];
        uint256 avg = s.settleCount > 0 ? s.totalSettleTime / s.settleCount : 0;
        return (
            s.onTimeSettlements,
            s.lateSettlements,
            s.disputesLost,
            s.disputesWon,
            s.volumeSettled,
            avg,
            s.settleCount
        );
    }

    /// @notice Get reliability score (0–10000 basis points)
    function getReliabilityScore(address member) external view returns (uint256) {
        Stats storage s = _stats[member];
        uint256 total = uint256(s.onTimeSettlements) + uint256(s.lateSettlements);
        if (total == 0) return 10000; // Perfect score for new members
        return (uint256(s.onTimeSettlements) * 10000) / total;
    }

    // ── Admin ───────────────────────────────────────────────────────

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function grantFactoryRole(address factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(FACTORY_ROLE, factory);
    }
}
