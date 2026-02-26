export const DISPUTE_MODULE_ABI = [
  // Events
  {
    type: 'event',
    name: 'ExpenseChallenged',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'challenger', type: 'address', indexed: true },
      { name: 'reasonCode', type: 'uint8', indexed: false },
      { name: 'evidenceHash', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'support', type: 'bool', indexed: false },
      { name: 'votesFor', type: 'uint256', indexed: false },
      { name: 'votesAgainst', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'expenseUpheld', type: 'bool', indexed: false },
      { name: 'votesFor', type: 'uint256', indexed: false },
      { name: 'votesAgainst', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'getDispute',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [
      { name: 'challenger', type: 'address' },
      { name: 'reasonCode', type: 'uint8' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'challengedAt', type: 'uint256' },
      { name: 'votesFor', type: 'uint256' },
      { name: 'votesAgainst', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'challengerBond', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasUserVoted',
    inputs: [
      { name: 'expenseId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserVote',
    inputs: [
      { name: 'expenseId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'CHALLENGER_BOND_USDC',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'challengeExpense',
    inputs: [
      { name: 'expenseId', type: 'uint256' },
      { name: 'reasonCode', type: 'uint8' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'voteOnDispute',
    inputs: [
      { name: 'expenseId', type: 'uint256' },
      { name: 'support', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveDispute',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
