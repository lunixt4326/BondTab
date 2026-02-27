# BondTab — About

> **Decentralized, bond-backed expense splitting on Polygon Mainnet.**

---

## What is BondTab?

BondTab is a trustless expense-splitting dApp where every group member deposits a refundable **USDC bond** as collateral. Expenses require receipt proof stored on IPFS, can be challenged through on-chain voting, and settle in a single click. If a member refuses to pay, their bond is automatically enforced — no trust required.

**Live:** [bondtab-production.up.railway.app](https://bondtab-production.up.railway.app)

---

## Deployed Contracts (Polygon Mainnet)

All contracts are live on Polygon at block **83,512,620**.

| Contract | Address |
|----------|---------|
| GroupFactory | `0x4427b7732AAD810F61c780E14FcB49e9Ec1C7686` |
| BondTabGroup (impl) | `0x78139f26808754e46e127a1E2875F68ad1A54FCa` |
| ExpenseModule (impl) | `0xe3319C3D92B7BAe163B77C2d9bb85c3bAc5f4F57` |
| DisputeModule (impl) | `0x169F59E6592d600ccA367caE0166F511653F1591` |
| ReputationRegistry | `0xff6d914260fafaa7eEF544BdFD15b9B2632bcac2` |

---

## How the Contracts Work

### 1. GroupFactory — *Creates Groups*

The singleton factory deploys three minimal proxy clones per group (EIP-1167 pattern — costs ~$0.02 gas). It initializes all modules, registers the group in the reputation system, and tracks member-to-group mappings.

**Functions:** `createGroup()`, `getGroups()`, `getGroupsByMember()`, `updateImplementations()`

### 2. BondTabGroup — *Core Vault*

Each group manages a USDC vault. Members deposit bonds, the contract tracks net balances (who owes whom), and settlement transfers USDC between debtors and creditors in one batch call. Supports EIP-712 co-signed expenses, admin controls, and auto-enforcement when debtors exceed the grace period.

**Functions:** `depositBond()`, `withdrawBond()`, `settleBatch()`, `settleFromBond()`, `slashBond()`, `updateBalance()`, `addMember()`, `removeMember()`, `pause()`, `unpause()`

### 3. ExpenseModule — *Expense Lifecycle*

Handles propose → challenge window → finalize/reject. Each expense stores the total amount, per-member splits, receipt hash (SHA-256), metadata hash, and IPFS CID. After the challenge window passes without dispute, `finalizeExpense()` updates all member balances.

**Functions:** `proposeExpense()`, `finalizeExpense()`, `setStatusChallenged()`, `setStatusRejected()`, `getExpense()`

### 4. DisputeModule — *Dispute Resolution*

Any bonded member can challenge an expense by depositing 5 USDC and providing a reason code (inflated, fake, duplicate, wrong split, or other). All members vote. After the vote window, resolution either slashes the challenger (if expense upheld) or slashes the payer and refunds the challenger (if rejected). Results feed into the reputation registry.

**Functions:** `challengeExpense()`, `voteOnDispute()`, `resolveDispute()`, `getDispute()`, `hasUserVoted()`

### 5. ReputationRegistry — *On-Chain Reputation*

A shared singleton across all groups. Records settlement events (on-time vs late, volume) and dispute outcomes (won/lost). Computes a reliability score from 0–100%. New members start at 100%.

**Functions:** `recordSettlement()`, `recordDisputeResult()`, `getReputation()`, `getReliabilityScore()`

---

## Features

- **Bond-Backed Groups** — USDC deposits guarantee good-faith participation
- **One-Click Settlement** — Batch net settlement in a single transaction
- **Native USDC** — Circle's official stablecoin on Polygon, no wrapping
- **On-Chain Disputes** — Challenge, vote, resolve with bond economics
- **Encrypted Receipts** — AES-256-GCM client-side encryption before IPFS upload
- **Receipt OCR** — Tesseract.js auto-extracts amounts from receipt photos
- **Reputation Tracking** — Reliability score visible on every member's profile
- **EIP-1167 Clones** — Gas-efficient group deployment (~$0.02)
- **Non-Custodial** — Funds held in auditable contracts, no central server
- **Pausable** — Admin emergency controls on every contract

---

## Pages

| Page | What it does |
|------|-------------|
| Landing | Animated hero, features, how-it-works, CTA |
| Dashboard | Groups grid, reliability %, volume stats |
| Create Group | Set name, bond, challenge period, add members |
| Group Overview | Expenses, balances, members, deposit/settle |
| Add Expense | Receipt upload + OCR, split selection |
| Expense Detail | Status, splits, challenge/finalize actions |
| Disputes Center | Vote bars, cast votes, resolve disputes |
| Settings | Contract info, admin controls |
| Profile | On-chain reputation with full stats |

---

## Tech Stack

**Contracts:** Solidity 0.8.24 · Hardhat · OpenZeppelin v5 · EIP-1167 · EIP-712
**Frontend:** React 18 · TypeScript · Vite · wagmi v2 · Tailwind CSS · Framer Motion
**Infrastructure:** Polygon Mainnet · Native USDC · IPFS/Pinata · Railway · AES-256-GCM

---

*Built on Polygon · Powered by USDC · Trust through cryptoeconomics*
