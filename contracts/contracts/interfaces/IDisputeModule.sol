// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDisputeModule — Interface for dispute module
interface IDisputeModule {
    function initialize(address group, address expenseModule) external;
    function challengeExpense(uint256 expenseId, uint8 reasonCode, bytes32 evidenceHash) external;
    function voteOnDispute(uint256 expenseId, bool support) external;
    function resolveDispute(uint256 expenseId) external;
}
