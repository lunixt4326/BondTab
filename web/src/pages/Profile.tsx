import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  User, TrendingUp, CheckCircle, AlertTriangle,
  Clock, DollarSign, Shield, Scale,
} from 'lucide-react';
import { useReputation } from '@/hooks/useReputation';
import { shortenAddress } from '@/config/constants';

export function Profile() {
  const { address } = useAccount();
  const { reputation, isLoading } = useReputation(address);

  const reliability = reputation?.reliabilityScore ?? 0;
  const volumeSettled = reputation?.volumeSettled
    ? Number(reputation.volumeSettled) / 1e6
    : 0;
  const avgSettleTime = reputation?.avgSettleTimeSec
    ? Number(reputation.avgSettleTimeSec)
    : 0;

  const stats = [
    {
      icon: CheckCircle,
      label: 'On-Time Settlements',
      value: reputation?.onTimeSettlements?.toString() ?? '—',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      icon: Clock,
      label: 'Late Settlements',
      value: reputation?.lateSettlements?.toString() ?? '—',
      color: 'text-amber',
      bg: 'bg-amber/10',
    },
    {
      icon: Scale,
      label: 'Disputes Won',
      value: reputation?.disputesWon?.toString() ?? '—',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      icon: AlertTriangle,
      label: 'Disputes Lost',
      value: reputation?.disputesLost?.toString() ?? '—',
      color: 'text-danger',
      bg: 'bg-danger/10',
    },
    {
      icon: DollarSign,
      label: 'Volume Settled',
      value: `$${volumeSettled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      icon: Clock,
      label: 'Avg Settle Time',
      value: avgSettleTime > 0
        ? `${(avgSettleTime / 3600).toFixed(1)}h`
        : '—',
      color: 'text-neutral-300',
      bg: 'bg-surface-700/30',
    },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="page-heading">Profile</h1>
        <p className="text-xs text-neutral-500 mt-1">Your onchain reputation and activity.</p>
      </div>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <User className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="font-mono text-sm text-neutral-200">
              {address ? shortenAddress(address) : 'Not connected'}
            </p>
            <p className="text-[10px] text-neutral-600 mt-0.5">Polygon Mainnet</p>
          </div>
        </div>

        {/* Reliability Score */}
        <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xs text-neutral-300 font-medium">Reliability Score</span>
            </div>
            <span className={`text-xl font-display font-semibold ${
              reliability >= 80 ? 'text-emerald-400' :
              reliability >= 50 ? 'text-amber' :
              reliability > 0 ? 'text-danger' :
              'text-neutral-500'
            }`}>
              {isLoading ? '—' : `${reliability.toFixed(1)}%`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-surface-800/80 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${reliability}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                reliability >= 80 ? 'bg-emerald-400' :
                reliability >= 50 ? 'bg-amber' :
                'bg-danger'
              }`}
            />
          </div>
          <p className="text-[10px] text-neutral-600 mt-2">
            Based on settlement history, disputes, and on-time payments.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="glass-card p-4"
          >
            <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <p className="text-xs text-neutral-500 mb-0.5">{stat.label}</p>
            <p className="text-sm font-medium text-neutral-200">{isLoading ? '—' : stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
