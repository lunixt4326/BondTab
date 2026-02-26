import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Shield, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';
import { formatUSDC, shortenAddress } from '@/config/constants';

interface GroupCardProps {
  address: `0x${string}`;
  index: number;
}

export function GroupCard({ address, index }: GroupCardProps) {
  const { groupName, members, params, hasBond } = useGroup(address);

  const memberCount = members?.length ?? 0;
  const minBond = params?.[1]; // minBondUSDC is index 1 in tuple

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link
        to={`/app/group/${address}`}
        className="glass-card-hover flex flex-col p-5 group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-medium text-sm text-neutral-100 truncate">
              {groupName ?? 'Loading…'}
            </h3>
            <span className="text-[10px] text-neutral-600 font-mono">
              {shortenAddress(address)}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-accent transition-colors shrink-0 mt-0.5" />
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px]">{memberCount} members</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {minBond !== undefined ? formatUSDC(minBond) : '—'} bond
            </span>
          </div>
        </div>

        {/* Bond status indicator */}
        {hasBond !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasBond ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">Bond Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-amber" />
                <span className="text-[10px] text-amber font-medium">Bond Required</span>
              </>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="skeleton w-32 h-4 mb-1" />
          <div className="skeleton w-20 h-3" />
        </div>
      </div>
      <div className="flex gap-4 mb-3">
        <div className="skeleton w-20 h-3" />
        <div className="skeleton w-24 h-3" />
      </div>
      <div className="skeleton w-16 h-3" />
    </div>
  );
}
