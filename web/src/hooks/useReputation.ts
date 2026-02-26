import { useReadContract } from 'wagmi';
import { REPUTATION_REGISTRY_ABI } from '../config/abis';
import { REPUTATION_REGISTRY_ADDRESS } from '../config/constants';

export interface ReputationData {
  onTimeSettlements: number;
  lateSettlements: number;
  disputesLost: number;
  disputesWon: number;
  volumeSettled: bigint;
  avgSettleTimeSec: bigint;
  settleCount: number;
  reliabilityScore: number;
}

export function useReputation(memberAddress: `0x${string}` | undefined) {
  const { data: repData, isLoading } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getReputation',
    args: memberAddress ? [memberAddress] : undefined,
    query: { enabled: !!memberAddress && !!REPUTATION_REGISTRY_ADDRESS },
  });

  const { data: reliabilityScore } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getReliabilityScore',
    args: memberAddress ? [memberAddress] : undefined,
    query: { enabled: !!memberAddress && !!REPUTATION_REGISTRY_ADDRESS },
  });

  const reputation: ReputationData | null = repData
    ? {
        onTimeSettlements: Number((repData as any)[0]),
        lateSettlements: Number((repData as any)[1]),
        disputesLost: Number((repData as any)[2]),
        disputesWon: Number((repData as any)[3]),
        volumeSettled: (repData as any)[4] as bigint,
        avgSettleTimeSec: (repData as any)[5] as bigint,
        settleCount: Number((repData as any)[6]),
        reliabilityScore: reliabilityScore ? Number(reliabilityScore) / 100 : 100,
      }
    : null;

  return { reputation, isLoading };
}
