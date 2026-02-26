import { useReadContract, useWriteContract } from 'wagmi';
import { DISPUTE_MODULE_ABI, ERC20_ABI } from '../config/abis';
import { USDC_ADDRESS } from '../config/constants';
import { addToast, updateToast } from '../components/Toast';
import { useAccount } from 'wagmi';

export function useDisputes(disputeModuleAddr: `0x${string}` | undefined) {
  const { address } = useAccount();

  // Separate writeContract instances to avoid race conditions
  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeChallenge } = useWriteContract();
  const { writeContract: writeVote } = useWriteContract();
  const { writeContract: writeResolve } = useWriteContract();

  const { data: challengerBondAmount } = useReadContract({
    address: disputeModuleAddr,
    abi: DISPUTE_MODULE_ABI,
    functionName: 'CHALLENGER_BOND_USDC',
    query: { enabled: !!disputeModuleAddr },
  });

  // NOTE: getDispute / hasUserVoted reads are done directly via useReadContract
  // in the consuming components (DisputeCard) to follow React Rules of Hooks.

  const approveChallengeBond = () => {
    if (!disputeModuleAddr || !challengerBondAmount) return;
    const toastId = addToast({ type: 'pending', title: 'Approving challenge bond...' });
    writeApprove({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [disputeModuleAddr, challengerBondAmount as bigint],
    }, {
      onSuccess: (hash) => updateToast(toastId, { type: 'success', title: 'Bond approved', txHash: hash }),
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Approval failed', message: err.message.slice(0, 100) }),
    });
  };

  const challengeExpense = (expenseId: number, reasonCode: number, evidenceHash: `0x${string}`) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Challenging expense...' });
    writeChallenge({
      address: disputeModuleAddr,
      abi: DISPUTE_MODULE_ABI,
      functionName: 'challengeExpense',
      args: [BigInt(expenseId), reasonCode, evidenceHash],
    }, {
      onSuccess: (hash) => updateToast(toastId, { type: 'success', title: 'Expense challenged!', txHash: hash }),
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Challenge failed', message: err.message.slice(0, 100) }),
    });
  };

  const voteOnDispute = (expenseId: number, support: boolean) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: `Voting ${support ? 'for' : 'against'}...` });
    writeVote({
      address: disputeModuleAddr,
      abi: DISPUTE_MODULE_ABI,
      functionName: 'voteOnDispute',
      args: [BigInt(expenseId), support],
    }, {
      onSuccess: (hash) => updateToast(toastId, { type: 'success', title: 'Vote cast!', txHash: hash }),
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Vote failed', message: err.message.slice(0, 100) }),
    });
  };

  const resolveDispute = (expenseId: number) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Resolving dispute...' });
    writeResolve({
      address: disputeModuleAddr,
      abi: DISPUTE_MODULE_ABI,
      functionName: 'resolveDispute',
      args: [BigInt(expenseId)],
    }, {
      onSuccess: (hash) => updateToast(toastId, { type: 'success', title: 'Dispute resolved!', txHash: hash }),
      onError: (err) => updateToast(toastId, { type: 'error', title: 'Resolve failed', message: err.message.slice(0, 100) }),
    });
  };

  return {
    challengerBondAmount: challengerBondAmount as bigint | undefined,
    approveChallengeBond,
    challengeExpense,
    voteOnDispute,
    resolveDispute,
  };
}
