import { useReadContract, useWriteContract } from 'wagmi';
import { DISPUTE_MODULE_ABI, ERC20_ABI } from '../config/abis';
import { USDC_ADDRESS } from '../config/constants';
import { addToast, updateToast } from '../components/Toast';
import { useAccount, usePublicClient } from 'wagmi';

export function useDisputes(disputeModuleAddr: `0x${string}` | undefined) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Separate writeContract instances to avoid race conditions
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeChallenge } = useWriteContract();
  const { writeContractAsync: writeVote } = useWriteContract();
  const { writeContractAsync: writeResolve } = useWriteContract();

  const { data: challengerBondAmount } = useReadContract({
    address: disputeModuleAddr,
    abi: DISPUTE_MODULE_ABI,
    functionName: 'CHALLENGER_BOND_USDC',
    query: { enabled: !!disputeModuleAddr },
  });

  // NOTE: getDispute / hasUserVoted reads are done directly via useReadContract
  // in the consuming components (DisputeCard) to follow React Rules of Hooks.

  const approveChallengeBond = async () => {
    if (!disputeModuleAddr || !challengerBondAmount) return;
    const toastId = addToast({ type: 'pending', title: 'Approving challenge bond...' });
    try {
      const hash = await writeApprove({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [disputeModuleAddr, challengerBondAmount as bigint],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming approval...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Bond approved', txHash: hash });
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Approval failed', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  const challengeExpense = async (expenseId: number, reasonCode: number, evidenceHash: `0x${string}`) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Challenging expense...' });
    try {
      const hash = await writeChallenge({
        address: disputeModuleAddr,
        abi: DISPUTE_MODULE_ABI,
        functionName: 'challengeExpense',
        args: [BigInt(expenseId), reasonCode, evidenceHash],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming challenge...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Expense challenged!', txHash: hash });
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Challenge failed', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  const voteOnDispute = async (expenseId: number, support: boolean) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: `Voting ${support ? 'for' : 'against'}...` });
    try {
      const hash = await writeVote({
        address: disputeModuleAddr,
        abi: DISPUTE_MODULE_ABI,
        functionName: 'voteOnDispute',
        args: [BigInt(expenseId), support],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming vote...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Vote cast!', txHash: hash });
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Vote failed', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  const resolveDispute = async (expenseId: number) => {
    if (!disputeModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Resolving dispute...' });
    try {
      const hash = await writeResolve({
        address: disputeModuleAddr,
        abi: DISPUTE_MODULE_ABI,
        functionName: 'resolveDispute',
        args: [BigInt(expenseId)],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming resolution...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Dispute resolved!', txHash: hash });
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Resolve failed', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  return {
    challengerBondAmount: challengerBondAmount as bigint | undefined,
    approveChallengeBond,
    challengeExpense,
    voteOnDispute,
    resolveDispute,
  };
}
