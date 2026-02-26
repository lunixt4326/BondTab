import { type ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { CHAIN_ID } from '../config/constants';

interface Props {
  children: ReactNode;
}

export function NetworkGuard({ children }: Props) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return <>{children}</>;
  }

  if (chainId !== CHAIN_ID) {
    return (
      <div className="min-h-screen bg-surface-950 bg-grid-pattern bg-grid flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 max-w-sm w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber/10 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-amber" />
          </div>
          <h2 className="font-display font-semibold text-lg text-neutral-100 mb-2">
            Wrong Network
          </h2>
          <p className="text-sm text-neutral-400 mb-6">
            BondTab operates exclusively on Polygon mainnet.
            Switch your wallet to continue.
          </p>
          <button
            onClick={() => switchChain({ chainId: polygon.id })}
            disabled={isPending}
            className="btn-primary w-full"
          >
            {isPending ? (
              <span className="animate-pulse-soft">Switching...</span>
            ) : (
              <>
                Switch to Polygon
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-xs text-neutral-600 mt-4">
            Chain ID: {CHAIN_ID} · Polygon PoS
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
