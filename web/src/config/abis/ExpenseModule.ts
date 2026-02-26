export const EXPENSE_MODULE_ABI = [
  // Events
  {
    type: 'event',
    name: 'ExpenseProposed',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'participants', type: 'address[]', indexed: false },
      { name: 'splits', type: 'uint256[]', indexed: false },
      { name: 'receiptHash', type: 'bytes32', indexed: false },
      { name: 'metadataHash', type: 'bytes32', indexed: false },
      { name: 'receiptCID', type: 'string', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpenseFinalized',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpenseRejected',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpenseStatusChanged',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'newStatus', type: 'uint8', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'expenseCount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getExpense',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [
      { name: 'payer', type: 'address' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'receiptHash', type: 'bytes32' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'status', type: 'uint8' },
      { name: 'proposedAt', type: 'uint256' },
      { name: 'participantCount', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getExpenseParticipants',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [
      { name: 'participants', type: 'address[]' },
      { name: 'splits', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getExpenseStatus',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'group',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  // Write functions
  {
    type: 'function',
    name: 'proposeExpense',
    inputs: [
      { name: 'totalAmountUSDC', type: 'uint256' },
      { name: 'participants', type: 'address[]' },
      { name: 'splits', type: 'uint256[]' },
      { name: 'receiptHash', type: 'bytes32' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'receiptCID', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeExpense',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
