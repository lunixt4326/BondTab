import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Scale, ThumbsUp, ThumbsDown,
  CheckCircle, AlertTriangle, Loader2, Clock,
} from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';
import { useExpenses, type ExpenseData } from '@/hooks/useExpenses';
import { useDisputes } from '@/hooks/useDisputes';
import { formatUSDC, shortenAddress, formatTimeRemaining } from '@/config/constants';
import { DISPUTE_MODULE_ABI } from '@/config/abis';

export function DisputesCenter() {
  const { groupAddress } = useParams<{ groupAddress: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const addr = groupAddress as `0x${string}`;

  const { groupName, members, params, disputeModuleAddr, expenseModuleAddr } = useGroup(addr);
  const { expenses, loading: isLoadingExpenses } = useExpenses(expenseModuleAddr);
  const {
    voteOnDispute, resolveDispute,
  } = useDisputes(disputeModuleAddr);

  const challengedExpenses = (expenses ?? []).filter((e) => e.status === 1);

  if (isLoadingExpenses) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate(`/app/group/${groupAddress}`)}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Group
        </button>
        <div className="glass-card p-10">
          <div className="skeleton w-48 h-4 mx-auto mb-2" />
          <div className="skeleton w-32 h-3 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(`/app/group/${groupAddress}`)}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to {groupName ?? 'Group'}
      </button>

      <div>
        <h1 className="page-heading flex items-center gap-2">
          <Scale className="w-5 h-5 text-accent" />
          Disputes Center
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Review, vote on, and resolve disputed expenses.
        </p>
      </div>

      {challengedExpenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Scale className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-400 mb-1">No active disputes</p>
          <p className="text-[11px] text-neutral-600">
            Challenged expenses will appear here for voting.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {challengedExpenses.map((exp, i) => (
            <DisputeCard
              key={exp.id}
              expense={exp}
              index={i}
              groupAddress={addr}
              disputeModuleAddress={disputeModuleAddr}
              myAddress={address}
              members={members ?? []}
              onVote={(expId, support) => voteOnDispute(expId, support)}
              onResolve={(expId) => resolveDispute(expId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DisputeCardProps {
  expense: ExpenseData;
  index: number;
  groupAddress: `0x${string}`;
  disputeModuleAddress: `0x${string}` | undefined;
  myAddress: `0x${string}` | undefined;
  members: string[];
  onVote: (expenseId: number, support: boolean) => void;
  onResolve: (expenseId: number) => void;
}

function DisputeCard({
  expense, index, groupAddress, disputeModuleAddress,
  myAddress, members, onVote, onResolve,
}: DisputeCardProps) {
  const [voting, setVoting] = useState<'for' | 'against' | null>(null);
  const [resolving, setResolving] = useState(false);
  const isVoting = voting !== null;
  const isResolving = resolving;

  // Read dispute details
  const { data: dispute } = useReadContract({
    address: disputeModuleAddress,
    abi: DISPUTE_MODULE_ABI,
    functionName: 'getDispute',
    args: [BigInt(expense.id)],
    query: { enabled: !!disputeModuleAddress },
  });

  // Check if user has voted
  const { data: hasVoted } = useReadContract({
    address: disputeModuleAddress,
    abi: DISPUTE_MODULE_ABI,
    functionName: 'hasUserVoted',
    args: myAddress ? [BigInt(expense.id), myAddress] : undefined,
    query: { enabled: !!disputeModuleAddress && !!myAddress },
  });

  const disputeData = dispute as [string, bigint, bigint, bigint, boolean] | undefined;
  const challenger = disputeData?.[0];
  const votesFor = disputeData?.[1] ?? 0n;
  const votesAgainst = disputeData?.[2] ?? 0n;
  const totalVotes = votesFor + votesAgainst;
  const quorum = members.length > 0 ? Math.ceil(members.length / 2) : 1;
  const canResolve = Number(totalVotes) >= quorum;

  const handleVote = (support: boolean) => {
    setVoting(support ? 'for' : 'against');
    onVote(expense.id, support);
    setTimeout(() => setVoting(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-200">
            {`Expense #${expense.id}`}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-neutral-600 font-mono">
              Payer: {shortenAddress(expense.payer)}
            </span>
            <span className="badge-danger text-[9px]">
              <AlertTriangle className="w-2.5 h-2.5" /> Challenged
            </span>
          </div>
        </div>
        <span className="text-sm font-medium text-neutral-200">
          {formatUSDC(expense.totalAmount)}
        </span>
      </div>

      {/* Challenger */}
      {challenger && (
        <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
          Challenged by <span className="font-mono">{shortenAddress(challenger)}</span>
        </div>
      )}

      {/* Voting */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Votes</span>
          <span className="text-[10px] text-neutral-600">
            {totalVotes.toString()}/{quorum} for quorum
          </span>
        </div>

        {/* Vote bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-surface-800/50 mb-3">
          {Number(totalVotes) > 0 && (
            <>
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(Number(votesFor) / Number(totalVotes)) * 100}%` }}
              />
              <div
                className="bg-danger transition-all"
                style={{ width: `${(Number(votesAgainst) / Number(totalVotes)) * 100}%` }}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-emerald-400">
            <ThumbsUp className="w-3 h-3 inline mr-1" />
            Reject expense: {votesFor.toString()}
          </span>
          <span className="text-danger">
            Keep expense: {votesAgainst.toString()}
            <ThumbsDown className="w-3 h-3 inline ml-1" />
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!hasVoted && myAddress && (
          <>
            <button
              onClick={() => handleVote(true)}
              disabled={isVoting}
              className="btn-primary text-xs flex-1 justify-center"
            >
              {voting === 'for' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="w-3.5 h-3.5" />
              )}
              Reject Expense
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={isVoting}
              className="btn-secondary text-xs flex-1 justify-center"
            >
              {voting === 'against' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ThumbsDown className="w-3.5 h-3.5" />
              )}
              Keep Expense
            </button>
          </>
        )}

        {hasVoted && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <CheckCircle className="w-3.5 h-3.5 text-accent" />
            You have voted
          </div>
        )}

        {canResolve && (
          <button
            onClick={() => {
              setResolving(true);
              onResolve(expense.id);
              setTimeout(() => setResolving(false), 2000);
            }}
            disabled={isResolving}
            className="btn-primary text-xs"
          >
            {isResolving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving…</>
            ) : (
              <><Scale className="w-3.5 h-3.5" /> Resolve</>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
