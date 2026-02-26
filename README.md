# BondTab

> USDC-bonded expense splitting on Polygon mainnet. Trustless by design.

Each group member deposits a refundable USDC bond. Expenses require receipt proof, can be challenged by group members, and settle in a single click. Onchain disputes, reputation tracking, and AES-encrypted receipts stored on IPFS.

---

## Architecture

```
BondTab/
├── contracts/          # Solidity (Hardhat)
│   ├── contracts/
│   │   ├── BondTabGroup.sol       # Core vault + balances + settlement
│   │   ├── ExpenseModule.sol      # Expense lifecycle
│   │   ├── DisputeModule.sol      # Challenge / vote / resolve
│   │   ├── ReputationRegistry.sol # Onchain reputation scores
│   │   ├── GroupFactory.sol       # Minimal-proxy factory (EIP-1167)
│   │   └── interfaces/           # Shared interfaces
│   ├── test/BondTab.test.ts
│   └── scripts/
│       ├── deploy.ts
│       └── verify.ts
└── web/                # React + Vite + wagmi
    ├── src/
    │   ├── pages/       # 9 page components
    │   ├── components/  # Reusable UI
    │   ├── hooks/       # Contract integration hooks
    │   ├── config/      # ABIs, wagmi, constants
    │   └── lib/         # Crypto, IPFS helpers
    ├── api/pin.ts       # Vercel serverless – Pinata proxy
    └── public/          # Logo, favicon
```

## Tech Stack

| Layer        | Choice                                      |
|-------------|----------------------------------------------|
| Chain       | Polygon PoS (mainnet, chainId 137)           |
| Token       | Native USDC (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`) |
| Contracts   | Solidity ^0.8.24, OpenZeppelin v5.1.0        |
| Toolchain   | Hardhat 2.22, ethers v6                       |
| Frontend    | Vite 5.4, React 18.3, TypeScript 5.4         |
| Web3        | wagmi v2.12, viem v2.21, WalletConnect v2    |
| Styling     | Tailwind CSS v3.4, Framer Motion v11         |
| OCR         | Tesseract.js v5.1 (client-side)              |
| IPFS        | Pinata (server-side JWT via Vercel function)  |
| Encryption  | AES-256-GCM via Web Crypto API               |
| Hosting     | Vercel                                        |

---

## Prerequisites

- **Node.js ≥ 18**
- **npm** (not pnpm)
- A Polygon RPC URL (e.g. Alchemy, Infura, or Ankr)
- A funded deployer wallet (MATIC for gas)
- Pinata account (for IPFS pinning)
- WalletConnect Project ID (from cloud.walletconnect.com)

---

## Quick Start

### 1. Install dependencies

```bash
cd contracts && npm install
cd ../web && npm install
```

### 2. Configure environment

```bash
# contracts/.env
cp contracts/.env.example contracts/.env
# Fill in: POLYGON_RPC_URL, DEPLOYER_PRIVATE_KEY, POLYGONSCAN_API_KEY, CONFIRM_MAINNET=true

# web/.env
cp web/.env.example web/.env
# Fill in: VITE_WALLETCONNECT_PROJECT_ID, PINATA_JWT
```

### 3. Compile & test contracts

```bash
cd contracts
npx hardhat compile
npx hardhat test
```

### 4. Deploy to Polygon mainnet

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network polygon
```

This writes deployed addresses to `web/src/config/deployed.json`.

### 5. Verify on Polygonscan

```bash
cd contracts
npx hardhat run scripts/verify.ts --network polygon
```

### 6. Run frontend locally

```bash
cd web
npm run dev
```

Open http://localhost:5173

### 7. Deploy frontend to Vercel

```bash
cd web
npx vercel --prod
```

Set `PINATA_JWT` as an environment variable in Vercel project settings.

---

## Contract Addresses

After deployment, addresses are saved in `web/src/config/deployed.json`:

```json
{
  "reputationRegistry": "0x...",
  "groupImplementation": "0x...",
  "expenseImplementation": "0x...",
  "disputeImplementation": "0x...",
  "groupFactory": "0x..."
}
```

---

## Security Notes

- **Non-custodial**: All funds are held in auditable smart contracts. No admin can withdraw user funds.
- **Bond enforcement**: Members who fail to settle can have their bond slashed automatically.
- **Client-side encryption**: Receipt images are AES-256-GCM encrypted in the browser before IPFS upload. Keys are stored locally and shared out-of-band.
- **Challenge mechanism**: Every expense has a configurable challenge window. Challenged expenses go to group vote.
- **Reputation**: Onchain settlement history builds a public reliability score (0-100%).

> ⚠️ **This software is provided as-is. Smart contracts have NOT been audited. Use at your own risk. Always test with small amounts first.**

---

## License

MIT
