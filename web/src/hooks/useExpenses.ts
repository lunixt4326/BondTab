import { useReadContract, useWriteContract } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { EXPENSE_MODULE_ABI } from '../config/abis';
import { DEPLOY_BLOCK } from '../config/constants';
import { addToast, updateToast } from '../components/Toast';
import { useCallback, useEffect, useState } from 'react';
import { parseAbiItem } from 'viem';

export interface ExpenseData {
  id: number;
  payer: `0x${string}`;
  totalAmount: bigint;
  receiptHash: `0x${string}`;
  metadataHash: `0x${string}`;
  status: number;
  proposedAt: bigint;
  participantCount: bigint;
  receiptCID?: string;
  participants?: `0x${string}`[];
  splits?: bigint[];
}

export function useExpenses(expenseModuleAddr: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: expenseCount, refetch: refetchCount } = useReadContract({
    address: expenseModuleAddr,
    abi: EXPENSE_MODULE_ABI,
    functionName: 'expenseCount',
    query: { enabled: !!expenseModuleAddr },
  });

  const fetchExpenses = useCallback(async () => {
    if (!expenseModuleAddr || !publicClient || !expenseCount) return;
    setLoading(true);
    try {
      const count = Number(expenseCount);
      const results: ExpenseData[] = [];

      // Fetch from events for rich data
      const logs = await publicClient.getLogs({
        address: expenseModuleAddr,
        event: parseAbiItem(
          'event ExpenseProposed(uint256 indexed expenseId, address indexed payer, uint256 totalAmount, address[] participants, uint256[] splits, bytes32 receiptHash, bytes32 metadataHash, string receiptCID, uint256 timestamp)'
        ),
        fromBlock: DEPLOY_BLOCK || 0n,
        toBlock: 'latest',
      });

      for (let i = 0; i < count; i++) {
        const log = logs.find((l) => l.args.expenseId === BigInt(i));
        
        // Also read current status from contract
        const expense = await publicClient.readContract({
          address: expenseModuleAddr,
          abi: EXPENSE_MODULE_ABI,
          functionName: 'getExpense',
          args: [BigInt(i)],
        });

        const [payer, totalAmount, receiptHash, metadataHash, status, proposedAt, participantCount] = expense as any;

        results.push({
          id: i,
          payer,
          totalAmount,
          receiptHash,
          metadataHash,
          status: Number(status),
          proposedAt,
          participantCount,
          receiptCID: log?.args.receiptCID as string | undefined,
          participants: log?.args.participants as `0x${string}`[] | undefined,
          splits: log?.args.splits as bigint[] | undefined,
        });
      }

      setExpenses(results);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseModuleAddr, publicClient, expenseCount]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const { writeContractAsync: writePropose } = useWriteContract();
  const { writeContractAsync: writeFinalize } = useWriteContract();

  const proposeExpense = async (params: {
    totalAmountUSDC: bigint;
    participants: `0x${string}`[];
    splits: bigint[];
    receiptHash: `0x${string}`;
    metadataHash: `0x${string}`;
    receiptCID: string;
  }) => {
    if (!expenseModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Submitting expense...' });
    try {
      const hash = await writePropose({
        address: expenseModuleAddr,
        abi: EXPENSE_MODULE_ABI,
        functionName: 'proposeExpense',
        args: [
          params.totalAmountUSDC,
          params.participants,
          params.splits,
          params.receiptHash,
          params.metadataHash,
          params.receiptCID,
        ],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming expense...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Expense proposed!', txHash: hash });
      refetchCount();
      fetchExpenses();
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Failed to propose', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  const finalizeExpense = async (expenseId: number) => {
    if (!expenseModuleAddr) return;
    const toastId = addToast({ type: 'pending', title: 'Finalizing expense...' });
    try {
      const hash = await writeFinalize({
        address: expenseModuleAddr,
        abi: EXPENSE_MODULE_ABI,
        functionName: 'finalizeExpense',
        args: [BigInt(expenseId)],
      });
      updateToast(toastId, { type: 'pending', title: 'Confirming finalization...', txHash: hash });
      await publicClient!.waitForTransactionReceipt({ hash, confirmations: 1 });
      updateToast(toastId, { type: 'success', title: 'Expense finalized!', txHash: hash });
      fetchExpenses();
    } catch (err: any) {
      updateToast(toastId, { type: 'error', title: 'Finalize failed', message: (err?.shortMessage || err?.message || '').slice(0, 100) });
    }
  };

  return {
    expenses,
    expenseCount: expenseCount ? Number(expenseCount) : 0,
    loading,
    proposeExpense,
    finalizeExpense,
    refetch: fetchExpenses,
  };
}
