import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Plus, X, ArrowLeft, Users, Shield, Clock, Loader2 } from 'lucide-react';
import { isAddress } from 'viem';
import { useGroupFactory } from '@/hooks/useGroupFactory';
import { parseUSDC } from '@/config/constants';

export function CreateGroup() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { createGroup, isCreating } = useGroupFactory();

  const [name, setName] = useState('');
  const [bondAmount, setBondAmount] = useState('10');
  const [challengePeriod, setChallengePeriod] = useState('86400'); // 1 day
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  const addMember = () => {
    const addr = memberInput.trim();
    if (!isAddress(addr)) {
      setError('Invalid Ethereum address');
      return;
    }
    if (addr.toLowerCase() === address?.toLowerCase()) {
      setError('You are added automatically as admin');
      return;
    }
    if (members.some((m) => m.toLowerCase() === addr.toLowerCase())) {
      setError('Member already added');
      return;
    }
    setMembers([...members, addr]);
    setMemberInput('');
    setError('');
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Group name is required');
    if (!bondAmount || Number(bondAmount) <= 0) return setError('Bond amount must be positive');
    if (members.length === 0) return setError('Add at least one other member');

    const allMembers = [address!, ...members] as `0x${string}`[];
    const bondWei = parseUSDC(bondAmount);
    const period = BigInt(challengePeriod);

    try {
      await createGroup({
        name: name.trim(),
        members: allMembers,
        minBondUSDC: bondWei,
        challengeWindowSeconds: period,
        quorumBps: 5000n,            // 50% quorum
        settlementGracePeriodSeconds: 259200n, // 3 days
        slashBps: 1000n,             // 10% slash
        voteWindowSeconds: period,   // same as challenge
      });
      navigate('/app');
    } catch {
      // Toast handles errors
    }
  };

  const shortenAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => navigate('/app')}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </button>

      <div>
        <h1 className="page-heading">Create Group</h1>
        <p className="text-xs text-neutral-500 mt-1">Set up a new bonded expense group.</p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="glass-card p-6 space-y-5"
      >
        {/* Group Name */}
        <div>
          <label className="label-text">Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Trip 2024"
            className="input-field"
            maxLength={32}
          />
        </div>

        {/* Bond Amount */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Bond Amount (USDC)
          </label>
          <input
            type="number"
            value={bondAmount}
            onChange={(e) => setBondAmount(e.target.value)}
            placeholder="10.00"
            min="0.01"
            step="0.01"
            className="input-field"
          />
          <p className="text-[10px] text-neutral-600 mt-1">
            Each member must deposit this amount to participate.
          </p>
        </div>

        {/* Challenge Period */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Challenge Period
          </label>
          <select
            value={challengePeriod}
            onChange={(e) => setChallengePeriod(e.target.value)}
            className="input-field"
          >
            <option value="3600">1 Hour</option>
            <option value="21600">6 Hours</option>
            <option value="43200">12 Hours</option>
            <option value="86400">1 Day</option>
            <option value="172800">2 Days</option>
            <option value="604800">7 Days</option>
          </select>
          <p className="text-[10px] text-neutral-600 mt-1">
            Time window for members to challenge an expense before it finalizes.
          </p>
        </div>

        {/* Members */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Members
          </label>

          {/* Current user (admin) */}
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-surface-800/50 border border-surface-700/30 mb-2">
            <span className="text-[11px] text-neutral-300 font-mono">{shortenAddr(address ?? '')}</span>
            <span className="badge-accent text-[9px]">You (Admin)</span>
          </div>

          {/* Added members */}
          <div className="space-y-1.5 mb-2">
            {members.map((m, i) => (
              <div
                key={m}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-800/50 border border-surface-700/30"
              >
                <span className="text-[11px] text-neutral-300 font-mono">{shortenAddr(m)}</span>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="text-neutral-600 hover:text-danger transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add member input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={memberInput}
              onChange={(e) => {
                setMemberInput(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMember();
                }
              }}
              placeholder="0x… member address"
              className="input-field flex-1"
            />
            <button type="button" onClick={addMember} className="btn-secondary text-xs shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}

        {/* Submit */}
        <button type="submit" disabled={isCreating} className="btn-primary w-full justify-center">
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Group
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
}
