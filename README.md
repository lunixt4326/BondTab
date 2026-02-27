<p align="center">
  <img src="logo.jpg" alt="BondTab" width="100" style="border-radius:16px" />
</p>

<h1 align="center">BondTab</h1>

<p align="center">
  <strong>Decentralized, Bond-Backed Expense Splitting on Polygon</strong>
</p>

<p align="center">
  <a href="https://bondtab-production.up.railway.app">Live App</a> ·
  <a href="https://polygonscan.com/address/0x4427b7732AAD810F61c780E14FcB49e9Ec1C7686">Factory on Polygonscan</a> ·
  <a href="#smart-contracts">Contracts</a> ·
  <a href="#features">Features</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Polygon-Mainnet-8247E5?logo=polygon&logoColor=white" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/USDC-Native-2775CA?logo=circle" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## The Idea

Splitting expenses with friends, roommates, or travel groups shouldn't require trust. **BondTab** replaces social trust with cryptoeconomic guarantees:

- Every member deposits a **refundable USDC bond** before participating.
- Expenses require **receipt proof** — encrypted and stored on IPFS.
- Any member can **challenge** a suspicious expense, triggering on-chain voting.
- If someone refuses to settle, their **bond is automatically enforced**.
- An on-chain **Reputation Registry** tracks every member's history across all groups.

> *Your money stays honest — even if your friends don't.*

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   GroupFactory                        │
│          (Singleton · Deploys Clones)                 │
│   ┌────────────────────────────────────────────┐     │
│   │  EIP-1167 Minimal Proxy                    │     │
│   │  ┌──────────┐ ┌────────────┐ ┌───────────┐ │     │
│   │  │BondTab   │ │Expense     │ │Dispute    │ │     │
│   │  │Group     │ │Module      │ │Module     │ │     │
│   │  │(vault,   │ │(propose,   │ │(challenge,│ │     │
│   │  │ bonds,   │ │ finalize,  │ │ vote,     │ │     │
│   │  │ settle)  │ │ receipt)   │ │ resolve)  │ │     │
│   │  └──────────┘ └────────────┘ └───────────┘ │     │
│   └────────────────────────────────────────────┘     │
│                        │                             │
│             ┌──────────▼──────────┐                  │
│             │ ReputationRegistry  │                  │
│             │  (shared singleton) │                  │
│             └─────────────────────┘                  │
└──────────────────────────────────────────────────────┘
             │                          │
   ┌─────────▼─────────┐     ┌─────────▼─────────┐
   │   Native USDC     │     │      IPFS          │
   │  (Polygon PoS)    │     │  (Pinata · AES)    │
   └───────────────────┘     └───────────────────┘
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🛡️ **Bond-Backed Groups** | Members deposit USDC bonds as collateral. No bond = no participation. |
| ⚡ **One-Click Settlement** | Computed net settlement across all members in a single batch transaction. |
| 💵 **Native USDC** | Real stablecoin on Polygon — no wrapped tokens, no price volatility. |
| 🗳️ **On-Chain Disputes** | Challenge any expense, cast votes, resolve with bond economics. |
| 🔐 **Encrypted Receipts** | AES-256-GCM encryption client-side before IPFS upload. Only key-holders can view. |
| 📸 **Receipt OCR** | Tesseract.js scans receipt images to auto-extract amounts. |
| 📊 **Reputation System** | On-chain registry tracks reliability: on-time settlements, dispute outcomes, volume. |
| 🏭 **Gas-Efficient Clones** | EIP-1167 minimal proxy pattern — each group costs ~$0.02 to deploy. |
| 🔒 **Pausable & Upgradeable** | Admin can pause groups; factory admin can update implementations. |
| 🌐 **Non-Custodial** | All funds in auditable smart contracts. No central server holds money. |

---

## Why Polygon?

| Benefit | Detail |
|---------|--------|
| **~$0.001–$0.02 per TX** | Expense proposals, votes, and settlements cost fractions of a cent. |
| **Native USDC** | Circle's official USDC on Polygon — no bridging, no wrapping. |
| **2-second finality** | Challenge votes and settlements confirm almost instantly. |
| **EVM compatible** | Full Solidity + OpenZeppelin support, standard tooling. |
| **Massive adoption** | 300M+ addresses, supported by every major wallet and DEX. |

---

## Smart Contracts

All contracts are deployed on **Polygon Mainnet** at block `83512620`.

### Deployed Addresses

| Contract | Address | Role |
|----------|---------|------|
| **GroupFactory** | [`0x4427b...7686`](https://polygonscan.com/address/0x4427b7732AAD810F61c780E14FcB49e9Ec1C7686) | Singleton: deploys group clones |
| **BondTabGroup** (impl) | [`0x7813...FCa`](https://polygonscan.com/address/0x78139f26808754e46e127a1E2875F68ad1A54FCa) | Implementation: vault, bonds, settlement |
| **ExpenseModule** (impl) | [`0xe331...F57`](https://polygonscan.com/address/0xe3319C3D92B7BAe163B77C2d9bb85c3bAc5f4F57) | Implementation: propose/finalize expenses |
| **DisputeModule** (impl) | [`0x169F...591`](https://polygonscan.com/address/0x169F59E6592d600ccA367caE0166F511653F1591) | Implementation: challenge/vote/resolve |
| **ReputationRegistry** | [`0xff6d...ac2`](https://polygonscan.com/address/0xff6d914260fafaa7eEF544BdFD15b9B2632bcac2) | Singleton: on-chain reputation |
| **USDC** | [`0x3c49...359`](https://polygonscan.com/address/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359) | Circle native USDC |

---

### BondTabGroup.sol

The core group contract. Each group is deployed as an EIP-1167 minimal proxy clone.

**Functions:**

| Function | Description |
|----------|-------------|
| `initialize(...)` | Clone setup: name, members, USDC, parameters, module addresses |
| `depositBond(uint256)` | Deposit USDC bond into the group vault |
| `withdrawBond(uint256)` | Withdraw bond (blocked if balance is negative) |
| `settleBatch(debtors[], creditors[], amounts[])` | Execute net settlement in one transaction |
| `settleFromBond(debtor, creditor, amount)` | Force-settle from bond after grace period |
| `slashBond(member, amount, recipient)` | Slash bond (called by dispute module) |
| `updateBalance(member, delta)` | Adjust net balance (called by modules) |
| `addMember(address)` / `removeMember(address)` | Admin member management |
| `verifyCosignature(...)` | EIP-712 typed-data co-sign verification |
| `pause()` / `unpause()` | Emergency controls |

**Events:** `MemberAdded`, `MemberRemoved`, `BondDeposited`, `BondWithdrawn`, `BondSlashed`, `BalanceUpdated`, `SettlementExecuted`, `BondEnforced`, `GroupPaused`, `GroupUnpaused`

---

### ExpenseModule.sol

Manages the full expense lifecycle: **propose → challenge window → finalize or reject.**

| Function | Description |
|----------|-------------|
| `proposeExpense(amount, participants[], splits[], receiptHash, metadataHash, ipfsCID)` | Submit expense with on-chain proof |
| `finalizeExpense(expenseId)` | Finalize after challenge window expires |
| `setStatusChallenged(expenseId)` | Mark as challenged (by DisputeModule) |
| `setStatusRejected(expenseId)` | Mark as rejected (by DisputeModule) |
| `getExpense(expenseId)` | Full expense data |

**Events:** `ExpenseProposed`, `ExpenseFinalized`, `ExpenseRejected`, `ExpenseStatusChanged`

---

### DisputeModule.sol

On-chain dispute resolution with bond economics. **Challenger bond: 5 USDC.**

**Reason Codes:** `1=Inflated`, `2=Fake Receipt`, `3=Duplicate`, `4=Wrong Split`, `5=Other`

| Function | Description |
|----------|-------------|
| `challengeExpense(expenseId, reasonCode, evidenceHash)` | Challenge with 5 USDC bond |
| `voteOnDispute(expenseId, support)` | Cast vote (1 member = 1 vote) |
| `resolveDispute(expenseId)` | Resolve: upheld → challenger slashed; rejected → payer slashed |

**Events:** `ExpenseChallenged`, `VoteCast`, `DisputeResolved`

---

### GroupFactory.sol

Singleton factory deploying group clones via EIP-1167.

| Function | Description |
|----------|-------------|
| `createGroup(name, members, challengeWindow, minBond, quorum, gracePeriod, slashBps, voteWindow)` | Deploy all 3 clones + initialize |
| `getGroups()` / `getGroupCount()` | Query all groups |
| `getGroupsByMember(address)` | Groups a member belongs to |
| `updateImplementations(...)` | Upgrade implementation contracts |

**Events:** `GroupCreated`

---

### ReputationRegistry.sol

Shared singleton tracking on-chain reputation across all groups.

| Function | Description |
|----------|-------------|
| `recordSettlement(member, amount, onTime, settleTime)` | Record settlement result |
| `recordDisputeResult(member, won)` | Record dispute outcome |
| `getReputation(address)` | Full stats: on-time/late, won/lost, volume |
| `getReliabilityScore(address)` | Score 0–10000 bps (100% = perfect) |

**Events:** `GroupRegistered`, `ReputationUpdated`

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Animated hero, feature cards, how-it-works, security section |
| **Dashboard** | `/app` | Groups grid, reliability score, volume settled |
| **Create Group** | `/app/new` | Name, bond amount, challenge period, add members |
| **Group Overview** | `/app/group/:addr` | Expenses, balances, members, deposit/settle |
| **Add Expense** | `/app/group/:addr/add` | Receipt OCR, amount, split picker |
| **Expense Detail** | `/app/group/:addr/expense/:id` | Status, splits, challenge/finalize, IPFS link |
| **Disputes** | `/app/group/:addr/disputes` | Vote bars, vote/resolve actions |
| **Settings** | `/app/group/:addr/settings` | Contract info, admin controls |
| **Profile** | `/app/profile` | Reputation: reliability, settlements, disputes |

---

## Tech Stack

### Smart Contracts
- **Solidity** `0.8.24` · optimizer 200 runs · viaIR · Paris EVM
- **Hardhat** — compile, test, deploy
- **OpenZeppelin v5** — ReentrancyGuard, Pausable, AccessControl, EIP-712, Clones, SafeERC20

### Frontend
- **React 18** + **TypeScript 5** · **Vite 5** build tool
- **wagmi v2** + **viem** — wallet & contract interaction
- **TanStack Query** — data fetching & caching
- **React Router v6** — nested SPA routing
- **Tailwind CSS** — custom design system with glass-card components
- **Framer Motion** — animations
- **Tesseract.js** — client-side receipt OCR
- **Web Crypto API** — AES-256-GCM receipt encryption

### Infrastructure
- **Polygon Mainnet** (chain ID 137) · **Native USDC**
- **IPFS / Pinata** — encrypted receipt storage
- **Railway** — Docker + Express production hosting
- **EIP-1167** — gas-efficient minimal proxy clones

---

## Getting Started

### Prerequisites
- Node.js >= 18
- MetaMask or WalletConnect wallet
- USDC on Polygon (for bonds and settlements)

### Local Development

```bash
git clone https://github.com/lunixt4326/BondTab.git
cd BondTab/web
npm install
cp .env.example .env.local
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Smart Contract Development

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

---

## Project Structure

```
BondTab/
├── contracts/                    # Solidity smart contracts
│   ├── contracts/
│   │   ├── BondTabGroup.sol          # Core group vault
│   │   ├── ExpenseModule.sol         # Expense lifecycle
│   │   ├── DisputeModule.sol         # Dispute resolution
│   │   ├── GroupFactory.sol          # EIP-1167 factory
│   │   └── ReputationRegistry.sol    # On-chain reputation
│   ├── scripts/deploy.ts
│   └── hardhat.config.ts
├── web/                          # React frontend
│   ├── src/
│   │   ├── pages/                    # 9 route pages
│   │   ├── components/               # Shared UI (AppLayout, Toast, etc.)
│   │   ├── hooks/                    # 5 contract hooks
│   │   ├── config/                   # ABIs, constants, deployed.json
│   │   └── lib/                      # Crypto (AES), IPFS utils
│   ├── server.js                     # Express production server
│   └── vite.config.ts
├── Dockerfile                    # Multi-stage Railway build
├── railway.toml                  # Railway config
└── README.md
```

---

## Environment Variables

### Build-time (VITE_ prefix, embedded in bundle)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_CHAIN_ID` | `137` | Polygon Mainnet |
| `VITE_FACTORY_ADDRESS` | From deployed.json | GroupFactory address |
| `VITE_REPUTATION_REGISTRY_ADDRESS` | From deployed.json | Registry address |
| `VITE_POLYGON_RPC_URL` | `https://polygon.drpc.org` | RPC endpoint |
| `VITE_WALLETCONNECT_PROJECT_ID` | — | Optional WalletConnect |

### Runtime (Railway server)

| Variable | Description |
|----------|-------------|
| `PINATA_JWT` | Pinata API token for IPFS pinning |
| `PORT` | Auto-set by Railway |

---

## License

MIT © 2026 BondTab

---

<p align="center">
  <sub>Built on Polygon · Powered by USDC · Trust through cryptoeconomics</sub>
</p>
