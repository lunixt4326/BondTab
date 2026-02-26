import deployed from './deployed.json';

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || '137');
export const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || deployed.usdc) as `0x${string}`;
export const FACTORY_ADDRESS = (import.meta.env.VITE_FACTORY_ADDRESS || deployed.factory) as `0x${string}`;
export const REPUTATION_REGISTRY_ADDRESS = (import.meta.env.VITE_REPUTATION_REGISTRY_ADDRESS || deployed.reputationRegistry) as `0x${string}`;
export const DEPLOY_BLOCK = BigInt(deployed.deployBlock || 0);
export const POLYGON_RPC_URL = import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon.drpc.org';

export const POLYGONSCAN_URL = 'https://polygonscan.com';
export const POLYGONSCAN_TX = (hash: string) => `${POLYGONSCAN_URL}/tx/${hash}`;
export const POLYGONSCAN_ADDRESS = (addr: string) => `${POLYGONSCAN_URL}/address/${addr}`;

// USDC formatting helpers
export const USDC_DECIMALS = 6;
export const formatUSDC = (amount: bigint): string => {
  const num = Number(amount) / 1e6;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export const parseUSDC = (amount: string): bigint => {
  const num = parseFloat(amount);
  return BigInt(Math.round(num * 1e6));
};

// Address formatting
export const shortenAddress = (addr: string, chars = 4): string =>
  addr ? `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}` : '';

// Time formatting
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

export const formatTimeRemaining = (deadline: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;
  if (remaining <= 0) return 'Expired';
  return formatDuration(remaining);
};
