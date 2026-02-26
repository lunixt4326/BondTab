import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle,
  Shield, ExternalLink, Loader2, Scale,
} from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';
import { useExpenses } from '@/hooks/useExpenses';
import { useDisputes } from '@/hooks/useDisputes';
import {
  formatUSDC, shortenAddress, formatTimeRemaining, POLYGONSCAN_TX,
} from '@/config/constants';
import { ipfsUrl } from '@/lib/ipfs';

function statusConfig(status: number) {
  switch (status) {
    case 0: return { label: 'Proposed', cls: 'badge-amber', icon: Clock, color: 'text-amber' };
    case 1: return { label: 'Challenged', cls: 'badge-danger', icon: AlertTriangle, color: 'text-danger' };
    case 2: return { label: 'Finalized', cls: 'badge-accent', icon: CheckCircle, color: 'text-accent' };
    case 3: return { label: 'Rejected', cls: 'badge-danger', icon: AlertTriangle, color: 'text-danger' };
    default: return { label: 'Unknown', cls: 'badge-neutral', icon: Clock, color: 'text-neutral-500' };
  }
}

export function ExpenseDetail() {
  const { groupAddress, expenseId } = useParams<{
    groupAddress: string;
    expenseId: string;
  }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const addr = groupAddress as `0x${string}`;
  const id = BigInt(expenseId || '0');

  const { groupName, members, expenseModuleAddr, disputeModuleAddr } = useGroup(addr);
  const { expenses, finalizeExpense } = useExpenses(expenseModuleAddr);
  const {
    challengeExpense, approveChallengeBond,
  } = useDisputes(disputeModuleAddr);

  const [isBusy, setIsBusy] = useState(false);

  const expense = expenses?.find((e) => e.id === Number(id));

  if (!expense) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button
          onClick={() => navigate(`/app/group/${groupAddress}`)}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Group
        </button>
        <div className="glass-card p-10 text-center">
          <div className="skeleton w-48 h-4 mx-auto mb-2" />
          <div className="skeleton w-32 h-3 mx-auto" />
        </div>
      </div>
    );
  }

  const s = statusConfig(expense.status);
  const Icon = s.icon;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const challengeDeadline = expense.proposedAt + 86400n; // Default 1 day
  const canChallenge = expense.status === 0 && challengeDeadline > now;
  const canFinalize = expense.status === 0 && challengeDeadline <= now;
  const isPayer = expense.payer.toLowerCase() === address?.toLowerCase();
  const timeLeft = canChallenge
    ? formatTimeRemaining(Number(challengeDeadline - now))
    : null;

  const handleChallenge = () => {
    setIsBusy(true);
    approveChallengeBond();
    const zeroHash = ('0x' + '0'.repeat(64)) as `0x${string}`;
    setTimeout(() => {
      challengeExpense(expense.id, 0, zeroHash);
      setIsBusy(false);
    }, 2000);
  };

  const handleFinalize = () => {
    finalizeExpense(expense.id);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => navigate(`/app/group/${groupAddress}`)}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to {groupName ?? 'Group'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="page-heading">
                {`Expense #${expense.id}`}
              </h1>
              <span className="text-[10px] text-neutral-600 font-mono">
                ID: {expense.id}
              </span>
            </div>
            <span className={s.cls}>
              <Icon className="w-3 h-3" /> {s.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Amount</span>
              <p className="text-sm font-medium text-neutral-200 mt-0.5">{formatUSDC(expense.totalAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Payer</span>
              <p className="text-sm font-medium text-neutral-200 mt-0.5 font-mono">
                {shortenAddress(expense.payer)}
                {isPayer && <span className="ml-1 text-accent text-[9px]">you</span>}
              </p>
            </div>
          </div>

          {/* Challenge Window */}
          {canChallenge && (
            <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber shrink-0" />
              <span className="text-xs text-amber flex-1">
                Challenge window: <strong>{timeLeft}</strong> remaining
              </span>
            </div>
          )}

          {/* Receipt CID */}
          {expense.receiptCID && (
            <div className="mt-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/20">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-1">
                Receipt (IPFS)
              </span>
              <a
                href={ipfsUrl(expense.receiptCID)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent hover:underline font-mono flex items-center gap-1"
              >
                {expense.receiptCID.slice(0, 20)}…
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Splits */}
        <div className="glass-card p-5">
          <h2 className="section-heading mb-3">Splits</h2>
          <div className="space-y-2">
            {(expense.participants ?? []).map((splitAddr: string, i: number) => (
              <div key={splitAddr} className="flex items-center justify-between py-1.5">
                <span className="text-[11px] font-mono text-neutral-400">
                  {shortenAddress(splitAddr)}
                  {splitAddr.toLowerCase() === address?.toLowerCase() && (
                    <span className="ml-1 text-accent text-[9px]">you</span>
                  )}
                </span>
                <span className="text-xs font-medium text-neutral-200">
                  {expense.splits?.[i] ? formatUSDC(expense.splits[i]) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canChallenge && !isPayer && (
            <button
              onClick={handleChallenge}
              disabled={isBusy}
              className="btn-danger text-xs flex-1 justify-center"
            >
              {isBusy ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
              ) : (
                <><Scale className="w-3.5 h-3.5" /> Challenge (5 USDC bond)</>
              )}
            </button>
          )}

          {canFinalize && (
            <button
              onClick={handleFinalize}
              className="btn-primary text-xs flex-1 justify-center"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Finalize Expense
            </button>
          )}

          {expense.status === 1 && (
            <Link
              to={`/app/group/${groupAddress}/disputes`}
              className="btn-secondary text-xs flex-1 justify-center"
            >
              <Scale className="w-3.5 h-3.5" /> View Dispute
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
