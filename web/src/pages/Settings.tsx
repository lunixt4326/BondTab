import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Settings as SettingsIcon, Shield, Users,
  Pause, Play, Loader2, AlertTriangle, Copy, Check,
} from 'lucide-react';
import { useGroup } from '@/hooks/useGroup';
import { shortenAddress, formatUSDC, formatDuration, POLYGONSCAN_ADDRESS } from '@/config/constants';

export function Settings() {
  const { groupAddress } = useParams<{ groupAddress: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const addr = groupAddress as `0x${string}`;

  const {
    groupName, admin, members, params,
  } = useGroup(addr);

  const isAdmin = admin?.toLowerCase() === address?.toLowerCase();
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [addr]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => navigate(`/app/group/${groupAddress}`)}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Group
      </button>

      <div>
        <h1 className="page-heading flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-accent" />
          Group Settings
        </h1>
        <p className="text-xs text-neutral-500 mt-1">{groupName ?? 'Loading…'}</p>
      </div>

      {/* Contract Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="section-heading">Contract Details</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Address</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-300">{shortenAddress(addr)}</span>
              <button onClick={copyAddress} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
              </button>
              <a
                href={POLYGONSCAN_ADDRESS(addr)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-accent hover:underline"
              >
                View ↗
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Admin</span>
            <span className="text-[11px] font-mono text-neutral-300">
              {admin ? shortenAddress(admin) : '—'}
              {isAdmin && <span className="ml-1 text-accent text-[9px]">you</span>}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Bond Required</span>
            <span className="text-[11px] text-neutral-300">
              {params?.[1] !== undefined ? formatUSDC(params[1]) : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Challenge Period</span>
            <span className="text-[11px] text-neutral-300">
              {params?.[0]
                ? formatDuration(Number(params[0]))
                : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Members</span>
            <span className="text-[11px] text-neutral-300">{members?.length ?? '—'}</span>
          </div>
        </div>
      </motion.div>

      {/* Members List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-5 space-y-3"
      >
        <h2 className="section-heading flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Members
        </h2>
        <div className="space-y-2">
          {(members ?? []).map((m) => (
            <div
              key={m}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-300">{shortenAddress(m)}</span>
                {m.toLowerCase() === admin?.toLowerCase() && (
                  <span className="badge-accent text-[9px]">Admin</span>
                )}
                {m.toLowerCase() === address?.toLowerCase() && (
                  <span className="badge-amber text-[9px]">You</span>
                )}
              </div>
              <a
                href={POLYGONSCAN_ADDRESS(m)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-accent hover:underline"
              >
                View ↗
              </a>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Danger Zone */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 border-danger/20"
        >
          <h2 className="section-heading text-danger flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Admin Actions
          </h2>
          <p className="text-[11px] text-neutral-500 mb-3">
            These actions are onchain and irreversible. Use with caution.
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs" disabled>
              <Pause className="w-3.5 h-3.5" /> Pause Group
            </button>
            <button className="btn-ghost text-xs" disabled>
              <Play className="w-3.5 h-3.5" /> Unpause
            </button>
          </div>
          <p className="text-[10px] text-neutral-700 mt-2">
            Pause/unpause functionality requires direct contract interaction for safety.
          </p>
        </motion.div>
      )}
    </div>
  );
}
