import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { GROUP_FACTORY_ABI } from '../config/abis';
import { FACTORY_ADDRESS } from '../config/constants';
import { addToast, updateToast } from '../components/Toast';

export function useGroupFactory() {
  const { address } = useAccount();

  const { data: userGroups, isLoading: groupsLoading, refetch: refetchGroups } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: GROUP_FACTORY_ABI,
    functionName: 'getGroupsByMember',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!FACTORY_ADDRESS },
  });

  const { data: groupCount } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: GROUP_FACTORY_ABI,
    functionName: 'getGroupCount',
    query: { enabled: !!FACTORY_ADDRESS },
  });

  const { writeContract, data: txHash, isPending: isCreating } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const createGroup = async (params: {
    name: string;
    members: `0x${string}`[];
    challengeWindowSeconds: bigint;
    minBondUSDC: bigint;
    quorumBps: bigint;
    settlementGracePeriodSeconds: bigint;
    slashBps: bigint;
    voteWindowSeconds: bigint;
  }) => {
    const toastId = addToast({ type: 'pending', title: 'Creating group...' });
    if (!FACTORY_ADDRESS) {
      updateToast(toastId, { type: 'error', title: 'Contracts not deployed', message: 'Factory address not configured' });
      return;
    }
    try {
      writeContract({
        address: FACTORY_ADDRESS,
        abi: GROUP_FACTORY_ABI,
        functionName: 'createGroup',
        args: [
          params.name,
          params.members,
          params.challengeWindowSeconds,
          params.minBondUSDC,
          params.quorumBps,
          params.settlementGracePeriodSeconds,
          params.slashBps,
          params.voteWindowSeconds,
        ],
      }, {
        onSuccess: (hash) => {
          updateToast(toastId, { type: 'success', title: 'Group created!', txHash: hash });
          refetchGroups();
        },
        onError: (err) => {
          updateToast(toastId, { type: 'error', title: 'Failed to create group', message: err.message.slice(0, 100) });
        },
      });
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Transaction rejected' });
    }
  };

  return {
    userGroups: (userGroups as `0x${string}`[]) || [],
    groupCount: groupCount ? Number(groupCount) : 0,
    groupsLoading,
    createGroup,
    isCreating: isCreating || isConfirming,
    isSuccess,
    txHash,
    refetchGroups,
  };
}
