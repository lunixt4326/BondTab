import { http, createConfig } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
const rpcUrl = import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon.drpc.org';

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [
    injected(),
    ...(projectId
      ? [walletConnect({ projectId, showQrModal: true, metadata: {
          name: 'BondTab',
          description: 'Bonded USDC expense splitting on Polygon',
          url: 'https://bondtab.app',
          icons: ['https://bondtab.app/logo.svg'],
        }})]
      : []),
  ],
  transports: {
    [polygon.id]: http(rpcUrl),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
