import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { shortenAddress, USDC_ADDRESS, POLYGONSCAN_ADDRESS } from '../config/constants';
import { useReadContract } from 'wagmi';
import { ERC20_ABI } from '../config/abis';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: maticBalance } = useBalance({ address });
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            className="btn-primary text-xs"
          >
            <Wallet className="w-3.5 h-3.5" />
            {connector.name === 'Injected' ? 'MetaMask' : connector.name}
          </button>
        ))}
      </div>
    );
  }

  const formatMatic = (val: typeof maticBalance) => {
    if (!val) return '0';
    return Number(val.formatted).toFixed(3);
  };

  const formatUsdc = (val: typeof usdcBalance) => {
    if (!val) return '0.00';
    return (Number(val) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-800 border border-surface-600/50 hover:border-accent/30 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-700 flex items-center justify-center">
          <span className="text-[10px] font-bold text-surface-950">
            {address?.slice(2, 4).toUpperCase()}
          </span>
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-medium text-neutral-200">
            {shortenAddress(address || '')}
          </div>
          <div className="text-[10px] text-neutral-500">
            ${formatUsdc(usdcBalance)} USDC
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 glass-card p-3 z-50"
          >
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-surface-600/40">
              <span className="text-xs text-neutral-400">Connected</span>
              <span className="badge-accent text-[10px]">Polygon</span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">POL</span>
                <span className="text-neutral-200">{formatMatic(maticBalance)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">USDC</span>
                <span className="text-neutral-200">${formatUsdc(usdcBalance)}</span>
              </div>
            </div>
            <div className="flex gap-1.5 mb-2">
              <button onClick={handleCopy} className="btn-ghost flex-1 text-xs py-1.5">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                href={POLYGONSCAN_ADDRESS(address || '')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost flex-1 text-xs py-1.5 no-underline"
              >
                <ExternalLink className="w-3 h-3" />
                Explorer
              </a>
            </div>
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full btn-ghost text-xs py-1.5 text-danger hover:text-danger"
            >
              <LogOut className="w-3 h-3" />
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
