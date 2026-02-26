import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Plus, Clock, ArrowLeft,
  CheckCircle, AlertTriangle, DollarSign, Loader2,
  Settings, Scale,
} from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';
import { useExpenses } from '@/hooks/useExpenses';
import { BalanceTable } from '@/components/BalanceTable';
import { ExpenseList, type ExpenseRowData } from '@/components/ExpenseList';
import { formatUSDC, formatDuration, shortenAddress } from '@/config/constants';

type Tab = 'expenses' | 'balances' | 'members';

export function GroupOverview() {
  const { groupAddress } = useParams<{ groupAddress: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const addr = groupAddress as `0x${string}`;

  const {
    groupName, admin, members, params, hasBond, bondBalance,
    netBalance, approveUSDC, depositBond, settleBatch,
    expenseModuleAddr,
    isAdmin,
  } = useGroup(addr);
  const { expenses, loading: isLoadingExpenses } = useExpenses(expenseModuleAddr);

  const [tab, setTab] = useState<Tab>('expenses');
  const [isBondLoading, setIsBondLoading] = useState(false);

  const minBond = params?.[1]; // minBondUSDC
  const challengeWindow = params?.[0]; // challengeWindowSeconds

  const handleDepositBond = useCallback(() => {
    if (!minBond) return;
    setIsBondLoading(true);
    approveUSDC(minBond);
    // Approving and depositing are fire-and-forget via toasts
    setTimeout(() => {
      depositBond(minBond);
      setIsBondLoading(false);
    }, 2000);
  }, [minBond, approveUSDC, depositBond]);

  const handleSettle = useCallback(() => {
    if (!members || members.length === 0) return;
    // Simplified: settle all members against each other
    // In reality, you'd compute net debts. For now, just call with empty arrays.
    settleBatch([], [], []);
  }, [members, settleBatch]);

  // Build balance rows from members
  const balanceRows = (members ?? []).map((m: string) => ({
    address: m,
    netBalance: 0n,
  }));

  // My net balance
  const myNetStr = netBalance !== undefined
    ? formatUSDC(netBalance)
    : '—';
  const myBondStr = bondBalance !== undefined
    ? formatUSDC(bondBalance)
    : '—';

  const expenseRows: ExpenseRowData[] = (expenses ?? []).map((e) => ({
    id: BigInt(e.id),
    payer: e.payer,
    totalAmount: e.totalAmount,
    description: `Expense #${e.id}`,
    status: e.status,
    timestamp: e.proposedAt,
    challengeDeadline: challengeWindow ? e.proposedAt + challengeWindow : undefined,
  }));

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'expenses', label: 'Expenses', count: expenses?.length },
    { key: 'balances', label: 'Balances' },
    { key: 'members', label: 'Members', count: members?.length },
  ];

  return (
    <div className="space-y-6">
      {/* Back / Settings Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/app/group/${groupAddress}/disputes`}
            className="btn-ghost text-xs"
          >
            <Scale className="w-3.5 h-3.5" /> Disputes
          </Link>
          {isAdmin && (
            <Link
              to={`/app/group/${groupAddress}/settings`}
              className="btn-ghost text-xs"
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </Link>
          )}
        </div>
      </div>

      {/* Group Header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="page-heading">{groupName ?? 'Loading…'}</h1>
            <span className="text-[10px] text-neutral-600 font-mono">{shortenAddress(addr)}</span>
          </div>
          <Link
            to={`/app/group/${groupAddress}/add`}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-accent" />
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Bond Req</span>
            </div>
            <p className="text-sm font-medium text-neutral-200">
              {minBond !== undefined ? formatUSDC(minBond) : '—'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-amber" />
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Challenge</span>
            </div>
            <p className="text-sm font-medium text-neutral-200">
              {challengeWindow
                ? formatDuration(Number(challengeWindow))
                : '—'}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-accent" />
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">My Bond</span>
            </div>
            <p className="text-sm font-medium text-neutral-200">{myBondStr}</p>
          </div>

          <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/20">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Net Bal</span>
            </div>
            <p className={`text-sm font-medium ${
              netBalance && netBalance > 0n ? 'text-emerald-400' :
              netBalance && netBalance < 0n ? 'text-danger' :
              'text-neutral-200'
            }`}>
              {myNetStr}
            </p>
          </div>
        </div>

        {/* Bond CTA */}
        {hasBond === false && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber" />
              <span className="text-xs text-amber">
                Deposit your bond of {minBond ? formatUSDC(minBond) : '—'} to participate.
              </span>
            </div>
            <button
              onClick={handleDepositBond}
              disabled={isBondLoading}
              className="btn-primary text-xs"
            >
              {isBondLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
              ) : (
                <><Shield className="w-3.5 h-3.5" /> Deposit Bond</>
              )}
            </button>
          </motion.div>
        )}

        {/* Settle CTA */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSettle}
            disabled={!hasBond}
            className="btn-secondary text-xs"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Settle All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-800/40 border border-surface-700/20 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-accent/20 text-accent'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-[10px] opacity-60">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'expenses' && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {isLoadingExpenses ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-4">
                    <div className="skeleton w-48 h-3 mb-2" />
                    <div className="skeleton w-24 h-3" />
                  </div>
                ))}
              </div>
            ) : (
              <ExpenseList expenses={expenseRows} groupAddress={groupAddress!} />
            )}
          </motion.div>
        )}

        {tab === 'balances' && (
          <motion.div
            key="balances"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="glass-card p-5">
              <BalanceTable balances={balanceRows} />
            </div>
          </motion.div>
        )}

        {tab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="glass-card p-5">
              <div className="space-y-2">
                {(members ?? []).map((m) => (
                  <div
                    key={m}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/30"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-neutral-600" />
                      <span className="text-[11px] font-mono text-neutral-300">{shortenAddress(m)}</span>
                      {m.toLowerCase() === admin?.toLowerCase() && (
                        <span className="badge-accent text-[9px]">Admin</span>
                      )}
                      {m.toLowerCase() === address?.toLowerCase() && (
                        <span className="badge-amber text-[9px]">You</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
