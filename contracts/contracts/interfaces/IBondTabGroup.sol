// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBondTabGroup — Interface for group contract
interface IBondTabGroup {
    function isMember(address account) external view returns (bool);
    function hasBond(address account) external view returns (bool);
    function getBondBalance(address account) external view returns (uint256);
    function getNetBalance(address account) external view returns (int256);
    function updateBalance(address member, int256 delta) external;
    function slashBond(address member, uint256 amount, address recipient) external;
    function getParams() external view returns (
        uint256 challengeWindowSeconds,
        uint256 minBondUSDC,
        uint256 quorumBps,
        uint256 settlementGracePeriodSeconds,
        uint256 slashBps,
        uint256 voteWindowSeconds
    );
    function usdc() external view returns (address);
    function reputationRegistry() external view returns (address);
    function memberCount() external view returns (uint256);
    function getMemberAt(uint256 index) external view returns (address);
}
