export const REPUTATION_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'getReputation',
    inputs: [{ name: 'member', type: 'address' }],
    outputs: [
      { name: 'onTimeSettlements', type: 'uint64' },
      { name: 'lateSettlements', type: 'uint64' },
      { name: 'disputesLost', type: 'uint64' },
      { name: 'disputesWon', type: 'uint64' },
      { name: 'volumeSettled', type: 'uint256' },
      { name: 'avgSettleTimeSec', type: 'uint256' },
      { name: 'settleCount', type: 'uint64' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReliabilityScore',
    inputs: [{ name: 'member', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ReputationUpdated',
    inputs: [
      { name: 'member', type: 'address', indexed: true },
      { name: 'action', type: 'string', indexed: false },
    ],
  },
] as const;
