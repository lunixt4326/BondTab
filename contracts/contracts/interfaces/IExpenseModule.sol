// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IExpenseModule — Interface for expense module
interface IExpenseModule {
    enum ExpenseStatus { Proposed, Challenged, Finalized, Rejected }

    function initialize(address group) external;

    function proposeExpense(
        uint256 totalAmountUSDC,
        address[] calldata participants,
        uint256[] calldata splits,
        bytes32 receiptHash,
        bytes32 metadataHash,
        string calldata receiptCID
    ) external returns (uint256);

    function finalizeExpense(uint256 expenseId) external;
    function setStatusChallenged(uint256 expenseId) external;
    function setStatusRejected(uint256 expenseId) external;

    function getExpense(uint256 expenseId) external view returns (
        address payer,
        uint256 totalAmount,
        bytes32 receiptHash,
        bytes32 metadataHash,
        ExpenseStatus status,
        uint256 proposedAt,
        uint256 participantCount
    );

    function getExpenseParticipants(uint256 expenseId) external view returns (
        address[] memory participants,
        uint256[] memory splits
    );

    function expenseCount() external view returns (uint256);
    function group() external view returns (address);
}
