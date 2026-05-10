# PromptHub Smart Contracts

> **5 Solidity contracts** powering the PromptHub decentralized AI prompt marketplace on **0G Galileo Testnet** (Chain ID: 16602).

---

## Deployed Contracts

| Contract | Address | Tx Hash |
|----------|---------|---------|
| **PromptHubTreasury** | `0xF50661bFA9F0E1f16344c6104f2766DA20b90dA5` | `0x301fc294...` |
| **AgentRegistry** | `0x0B1e124CA78dA109A8B336FB1707B3398BB867A7` | `0x6691a6e5...` |
| **PromptHubMarketplace** | `0x52739b3c73bfa5Ed6d2d79Ba438E94CD09D35415` | `0x0ce9f7ab...` |
| **PromptHubEscrowHire** | `0xA7F0ba74F8da21cC7aadd17919d16139e2836f61` | `0xd597f117...` |
| **PromptHubContests** | `0x9B37E63731d7725Fb91fc55C178FDC63fec20062` | `0xd5e07905...` |

**Network:** 0G Galileo Testnet  
**Chain ID:** 16602  
**RPC:** https://evmrpc-testnet.0g.ai  
**Explorer:** https://chainscan-galileo.0g.ai  
**Deployer:** `0xFeff727205Fe524A3A8A16C404FeC9Cfe4124aCd`  
**Deployed At:** 2026-05-03T13:50:12.218Z

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PromptHubTreasury                       │
│              (Collects 2.5% fee from all txs)                │
└──────────────────────────┬──────────────────────────────────┘
                           │ receives fees
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ PromptHub       │ │ PromptHub    │ │ PromptHub        │
│ Marketplace     │ │ EscrowHire   │ │ Contests         │
│ (ERC-721 NFT)   │ │ (P2P Escrow) │ │ (Prize Pools)    │
└────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
         │                 │                   │
         └─────────────────┼───────────────────┘
                           │ updates reputation
                           ▼
              ┌────────────────────────┐
              │     AgentRegistry      │
              │  (Identity & Reputation)│
              └────────────────────────┘
```

---

## Contracts Overview

### 1. PromptHubTreasury

**Purpose:** Platform fee collector. Receives 2.5% from every marketplace sale, escrow completion, and contest payout.

| Function | Access | Description |
|----------|--------|-------------|
| `receive()` | Public | Accept native 0G deposits |
| `deposit()` | Public | Explicit deposit |
| `withdraw(recipient, amount)` | Owner | Withdraw funds |
| `getBalance()` | View | Check treasury balance |

---

### 2. AgentRegistry (ERC-7857 Inspired)

**Purpose:** On-chain identity and reputation layer for AI creators and agents.

| Function | Access | Description |
|----------|--------|-------------|
| `registerAgent(metadataUri)` | Public | Register as AI creator |
| `updateMetadata(metadataUri)` | Registered | Update profile metadata |
| `verifyAgent(agent)` | Owner | Verify creator identity |
| `unverifyAgent(agent)` | Owner | Revoke verification |
| `setAuthorizedUpdater(updater, bool)` | Owner | Authorize contracts to update reputation |
| `updateReputation(agent, rating, jobCompleted)` | Authorized | Update reputation metrics |
| `getReputation(agent)` | View | Get full reputation data |
| `isVerified(agent)` | View | Check verification status |
| `isRegistered(agent)` | View | Check registration |

**Reputation Metrics:**
- `isVerified` — Admin-verified identity
- `completedJobs` — Total completed sales/jobs
- `totalReviews` — Number of ratings received
- `ratingSum` — Sum of all ratings (0-50 scale per review)
- `registeredAt` — Registration timestamp

---

### 3. PromptHubMarketplace (ERC-721)

**Purpose:** NFT marketplace for AI prompts. Mints prompts as ERC-721 tokens with content stored on 0G Storage.

| Function | Access | Description |
|----------|--------|-------------|
| `listPrompt(metadataUri, price, royaltyPerMille, storageHash)` | Public | Mint & list prompt NFT |
| `buyPrompt(tokenId)` | Payable | Purchase prompt — transfers NFT, pays seller/creator/treasury |
| `delistPrompt(tokenId)` | Owner | Remove from sale |
| `updatePrice(tokenId, newPrice)` | Owner | Change listing price |
| `relistPrompt(tokenId, newPrice)` | Owner | Relist delisted prompt |
| `rateCreator(tokenId, rating)` | Buyer | Rate creator (0-50) |
| `createPromptVersion(tokenId, metadataUri, storageHash)` | Creator | Add new version |
| `canAccess(tokenId, user)` | View | Check content access rights |
| `getStorageHash(tokenId)` | Authorized | Get 0G Storage hash |
| `totalPrompts()` | View | Total prompts minted |

**Key Features:**
- **ERC-721 NFT** — Each prompt is a unique token
- **Royalties** — Creator earns on every resale (0-20%, configurable)
- **Platform Fee** — 2.5% to Treasury on every sale
- **Content Gating** — Only owner/purchaser can access `storageHash`
- **Versioning** — Immutable version history for prompt updates
- **0G Storage Integration** — Content referenced by root hash

**Payment Flow:**
```
Buyer pays → 2.5% fee → Treasury
           → Royalty (if resale) → Original Creator
           → Remainder → Current Seller
```

---

### 4. PromptHubEscrowHire

**Purpose:** P2P escrow for hiring AI creators. Client deposits funds, artist completes work, funds release on approval.

| Function | Access | Description |
|----------|--------|-------------|
| `createJob(artist)` | Payable | Create job & deposit escrow |
| `completeJob(jobId)` | Client | Release funds to artist |
| `refundJob(jobId)` | Client/Owner | Refund to client |
| `disputeJob(jobId)` | Owner | Admin disputes |
| `disputeJobArtist(jobId)` | Artist | Artist disputes after timeout |
| `resolveDispute(jobId, payoutTo)` | Owner | Resolve dispute |
| `getJob(jobId)` | View | Get job details |

**Job Status Flow:**
```
PENDING → COMPLETED (client approves → artist paid)
        → REFUNDED (client/admin cancels → client refunded)
        → DISPUTED (timeout or admin) → RESOLVED (admin decides)
```

**Key Features:**
- **Timeout Protection** — Artist can dispute after ~1 week (1008 blocks)
- **2.5% Platform Fee** — Deducted on completion
- **Reputation Update** — Artist reputation updated on completion

---

### 5. PromptHubContests

**Purpose:** Multi-winner escrow for brand design contests with tiered prize pools.

| Function | Access | Description |
|----------|--------|-------------|
| `fundContest(numTiers, amounts[], deadline)` | Payable | Create & fund contest |
| `submitEntry(contestId, entryId)` | Public | Submit entry (0G Storage hash) |
| `declareWinner(contestId, place, winner)` | Brand | Declare winner (requires submission) |
| `declareWinnerExternal(contestId, place, winner)` | Brand | Declare winner (off-chain entries) |
| `cancelContest(contestId)` | Brand/Owner | Cancel & refund remaining |
| `hasSubmitted(contestId, artist)` | View | Check submission status |
| `getPrizeTier(contestId, place)` | View | Get tier info |
| `getContest(contestId)` | View | Get contest info |

**Contest Flow:**
```
Brand funds → OPEN (artists submit) → Brand declares winners → COMPLETED
                                    → Brand/Admin cancels → CANCELLED (refund)
```

**Key Features:**
- **Up to 5 prize tiers** — Flexible prize distribution
- **On-chain submissions** — Entries stored as 0G Storage hashes
- **Auto-complete** — Contest completes when all winners declared
- **2.5% Platform Fee** — Deducted per winner payout
- **Reputation Update** — Winners get reputation boost

---

## Tech Stack

| Component | Version |
|-----------|---------|
| Solidity | 0.8.24 |
| Hardhat | 2.24+ |
| OpenZeppelin | 5.6.1 |
| EVM Version | Cancun |
| Optimizer | Enabled (200 runs) |
| Network | 0G Galileo Testnet (16602) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- A funded wallet on 0G Galileo Testnet

### Install

```bash
cd Prompthub-smartcontract
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env: add your PRIVATE_KEY
```

### Compile

```bash
npm run compile
```

### Deploy

```bash
npm run deploy:0g-testnet
```

### Test

```bash
npm run test
```

---

## Deployment Output

The deploy script (`scripts/deploy.cjs`) automatically:

1. Deploys all 5 contracts in correct dependency order
2. Wires `AgentRegistry` — authorizes Marketplace, Escrow, and Contests as reputation updaters
3. Runs post-deploy health checks
4. Saves artifacts to `deployments/`:
   - `0g-testnet.json` — Addresses, tx hashes, metadata
   - `0g-testnet.env` — Ready-to-paste env variables for frontend & backend

### Deployment Order

```
1. PromptHubTreasury (no deps)
2. AgentRegistry (no deps)
3. PromptHubMarketplace (treasury, agentRegistry)
4. PromptHubEscrowHire (treasury, agentRegistry)
5. PromptHubContests (treasury, agentRegistry)
```

### Post-Deploy Wiring

```
AgentRegistry.setAuthorizedUpdater(marketplace, true)
AgentRegistry.setAuthorizedUpdater(escrowHire, true)
AgentRegistry.setAuthorizedUpdater(contests, true)
```

---

## Security Features

- **ReentrancyGuard** — All payment functions protected against reentrancy
- **Ownable** — Admin functions restricted to deployer
- **Input Validation** — All user inputs validated (prices > 0, valid addresses, etc.)
- **Safe Transfers** — Low-level `call` with success checks for all ETH transfers
- **Excess Refund** — Overpayment automatically refunded to buyer
- **Timeout Protection** — Artists can dispute stale escrow jobs after ~1 week

---

## Integration Points

### Backend (Laravel)

The backend verifies on-chain transactions via direct RPC calls:
- `eth_getTransactionReceipt` — Verify purchase/escrow/contest funding
- `AgentRegistry.isVerified(address)` — Check creator verification status

### Frontend (Next.js)

The frontend interacts with contracts via ethers.js v6:
- MetaMask wallet connection with auto-network switching to 0G Galileo
- Direct contract calls for listing, buying, escrow creation, contest funding

---

## Project Structure

```
Prompthub-smartcontract/
├── contracts/
│   └── solidity/
│       ├── AgentRegistry.sol          # Identity & reputation
│       ├── PromptHubMarketplace.sol   # ERC-721 NFT marketplace
│       ├── PromptHubEscrowHire.sol    # P2P escrow
│       ├── PromptHubContests.sol      # Contest prize pools
│       ├── PromptHubTreasury.sol      # Fee collector
│       └── interfaces/
│           └── IAgentRegistry.sol     # Cross-contract interface
├── scripts/
│   └── deploy.cjs                     # Deployment script
├── deployments/
│   ├── 0g-testnet.json               # Deployment artifacts
│   └── 0g-testnet.env                # Env variables for frontend/backend
├── hardhat.config.cjs                 # Hardhat configuration
├── DEPLOYMENT-RUNBOOK.md              # Deployment guide
└── package.json
```

---

## License

ISC
