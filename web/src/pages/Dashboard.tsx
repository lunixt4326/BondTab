import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Plus, Layers, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { GroupCard, GroupCardSkeleton } from '@/components/GroupCard';
import { useGroupFactory } from '@/hooks/useGroupFactory';
import { useReputation } from '@/hooks/useReputation';

export function Dashboard() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { userGroups, groupsLoading } = useGroupFactory();
  const { reputation } = useReputation(address);

  const reliabilityScore = reputation?.reliabilityScore ?? null;

  const stats = [
    {
      icon: Layers,
      label: 'Groups',
      value: groupsLoading ? '—' : String(userGroups?.length ?? 0),
      iconColor: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/10',
    },
    {
      icon: TrendingUp,
      label: 'Reliability',
      value: reliabilityScore !== null ? `${reliabilityScore.toFixed(1)}%` : '—',
      iconColor: 'text-amber',
      bg: 'bg-amber/10',
      border: 'border-amber/10',
    },
    {
      icon: DollarSign,
      label: 'Volume Settled',
      value: reputation?.volumeSettled !== undefined
        ? `$${(Number(reputation.volumeSettled) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—',
      iconColor: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-accent" />
            Dashboard
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Your groups and reputation at a glance.</p>
        </div>
        <button onClick={() => navigate('/app/new')} className="btn-primary text-xs group">
          <Plus className="w-3.5 h-3.5" />
          New Group
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`glass-card p-4 border ${stat.border} hover:border-accent/20 transition-colors ${
              i === 2 ? 'col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-display font-semibold text-neutral-100">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Groups grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-heading">Your Groups</h2>
          {userGroups && userGroups.length > 0 && (
            <span className="text-[10px] text-neutral-600 font-mono">{userGroups.length} total</span>
          )}
        </div>

        {groupsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        ) : userGroups && userGroups.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userGroups.map((addr: `0x${string}`, i: number) => (
              <GroupCard key={addr} address={addr} index={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-14 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/3 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-surface-700/30 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-7 h-7 text-neutral-600" />
              </div>
              <p className="text-sm text-neutral-300 mb-1 font-medium">No groups yet</p>
              <p className="text-[11px] text-neutral-600 mb-5 max-w-xs mx-auto">
                Create your first bonded expense group to start splitting costs with trust guarantees.
              </p>
              <button onClick={() => navigate('/app/new')} className="btn-primary text-xs mx-auto group">
                <Plus className="w-3.5 h-3.5" />
                Create Group
              </button>
            </div>
          </motion.div>
        )}
      </section>
    </div>
  );
}
