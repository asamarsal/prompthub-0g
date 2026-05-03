<p align="center">
  <img src="prompthub-logo.png" alt="PromptHub Logo" width="300" />
</p>

<h1 align="center">PromptHub</h1>

<p align="center">
  <strong>The On-Chain Economy for AI Prompt Creators</strong><br/>
  NFT ownership · Escrow freelancing · Brand contests — powered by 5 smart contracts on 0G Galileo Testnet
</p>

<p align="center">
  <a href="https://prompthub.my.id">Live Demo</a> · <a href="https://prompthubdapps.biz.id">Backend API</a> · <a href="https://chainscan-galileo.0g.ai">0G Explorer</a>
</p>

---

## What is PromptHub?

PromptHub is a full-stack Web2.5 marketplace where AI creators mint, sell, and license prompts as **ERC-721 NFTs** on the **0G blockchain**. It combines Web2-grade UX (real-time messaging, creator dashboards, analytics) with trustless on-chain logic (marketplace, escrow hire, contest payouts). Every transaction is verifiable on 0G Explorer. No middleman. No trust required.

---

## The Problem

The AI prompt market is worth **$500M+** and growing, yet it runs entirely on trust:

1. **No ownership proof** — Creators upload prompts to centralized platforms (PromptBase, ChatGPT Store) with zero on-chain provenance. Copy-paste piracy is rampant.
2. **No secure freelancing** — AI freelancers accept jobs on Fiverr/Upwork with 20% platform fees and no escrow guarantee. Disputes are resolved by the platform, not code.
3. **No composability** — Prompts are static text files. They can't be resold, licensed, or composed into agent workflows programmatically.
4. **No creator analytics** — Creators have no real-time visibility into earnings, buyer behavior, or asset performance.

**Bottom line:** AI creators produce high-value intellectual property but have no infrastructure to own, monetize, or protect it.

---

## The Solution

PromptHub solves this with **4 interconnected products**, each backed by a dedicated smart contract on 0G:

### 1. NFT Marketplace (`PromptHubMarketplace.sol`)

- Prompts are minted as **ERC-721 NFTs** with encrypted content
- Purchase triggers on-chain ownership transfer + content decryption
- Built-in **royalty system** (creators earn on every resale)
- **2.5% platform fee** collected by Treasury contract
- Backend verifies purchase via `eth_getTransactionReceipt` RPC call to 0G node

### 2. Escrow Hire — P2P Freelancing (`PromptHubEscrowHire.sol`)

- Client deposits funds into smart contract escrow
- Artist completes work, client approves, funds release automatically
- **Timeout protection**: if client doesn't respond, artist can claim after deadline
- Dispute resolution built into contract logic — no human arbitration needed

### 3. Brand Contests (`PromptHubContests.sol`)

- Brands fund multi-tier prize pools (1st, 2nd, 3rd place)
- Artists submit entries on-chain
- Winners declared by brand, **instant payout from contract** — no manual transfers
- Full transparency: prize pool, entries, and winners all on-chain

### 4. Creator Command Center (Web2 Dashboard)

- Real-time earnings analytics and transaction history
- Asset management: list, delist, relist, update pricing
- Messaging system with WebSocket (Laravel Reverb)
- Follower/connection system, reviews, and reputation scores

### Bonus: `AgentRegistry.sol` (ERC-7857 Inspired)

- On-chain identity for AI creators and autonomous agents
- Verification status, reputation score, completed job count
- Foundation for future agent-to-agent prompt trading

---

## Technical Architecture

![Technical Architecture](Prompthub-frontend/public/readme/technical-architecture.png)

**Key technical decisions:**

- **Solidity 0.8.24** with optimizer (200 runs) targeting `cancun` EVM
- **Hardhat** for compilation, testing, and deployment to 0G Galileo (chain ID: `16602`)
- **On-chain verification**: Backend calls `eth_getTransactionReceipt` directly to 0G RPC — no reliance on third-party indexers
- **Content gating**: Prompt content is encrypted; only verified on-chain owners can decrypt via backend API
- **Real-time**: WebSocket via Laravel Reverb for messaging, typing indicators, and notifications

---

## How It Works

![How It Works](Prompthub-frontend/public/readme/howitworks.png)

---

## What's Built

| Component | Status | Details |
|-----------|--------|---------|
| NFT Marketplace | **Live** | List, buy, delist, relist prompts with on-chain ownership |
| Escrow Hire | **Live** | P2P freelance with smart contract escrow |
| Brand Contests | **Live** | Multi-tier prize pools with instant payout |
| Creator Dashboard | **Live** | Real-time analytics, earnings tracking, asset management |
| Messaging | **Live** | WebSocket real-time chat between creators and buyers |
| Smart Contracts | **5 contracts** | Marketplace, Escrow, Contests, Treasury, AgentRegistry |
| On-chain Verification | **Working** | Backend verifies purchases via 0G RPC |
| MetaMask Integration | **Working** | Auto-switch to 0G Galileo network |

**Live URLs:**

- **Frontend:** [https://prompthub.my.id](https://prompthub.my.id)
- **Backend API:** [https://prompthubdapps.biz.id](https://prompthubdapps.biz.id)

---

## Why 0G Blockchain?

We didn't just "deploy on 0G" — we built specifically **for** 0G's architecture:

| 0G Feature | How PromptHub Uses It |
|------------|----------------------|
| **0G EVM (Galileo)** | 5 Solidity contracts deployed — all financial logic runs trustlessly on-chain |
| **0G Storage Layer** | Encrypted prompt content stored on decentralized storage — censorship-resistant, owner-gated |
| **High throughput** | Marketplace transactions (mint, buy, transfer) execute in seconds — Web2-like UX |
| **Low gas fees** | Micro-transactions viable — prompts can be priced at fractions of 0G tokens |
| **0G Explorer** | Every transaction (purchase, escrow deposit, contest payout) is publicly verifiable |
| **EVM compatibility** | Standard ERC-721 + custom contracts — composable with any 0G dApp or agent framework |

**Why not other chains?** 0G is purpose-built for AI workloads. Its modular storage layer lets us store encrypted prompt data natively — no need for external IPFS pinning services. The high throughput means our marketplace can handle real-time trading without congestion.

---

## Competitive Advantage

| Feature | PromptBase | ChatGPT Store | Fiverr AI | **PromptHub** |
|---------|-----------|---------------|-----------|---------------|
| On-chain ownership | No | No | No | **ERC-721 NFT** |
| Trustless escrow | No | No | No | **Smart contract** |
| Creator royalties | No | No | No | **On-chain, automatic** |
| Platform fee | 20% | 30% | 20% | **2.5%** |
| Verifiable transactions | No | No | No | **0G Explorer** |
| Decentralized storage | No | No | No | **0G Storage** |
| Real-time messaging | No | No | Yes | **WebSocket** |
| Creator analytics | Basic | None | Basic | **Full dashboard** |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, ethers.js v6 |
| Backend | Laravel 12, PostgreSQL, Redis, Laravel Reverb (WebSocket) |
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin patterns |
| Blockchain | 0G Galileo Testnet (Chain ID: 16602) |
| Storage | 0G Storage Layer / IPFS-compatible |
| Auth | MetaMask wallet + Laravel Sanctum tokens |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **PHP 8.2+** & **Composer**
- **PostgreSQL**
- **MetaMask** browser extension (configured for 0G Galileo Testnet)

### 1. Smart Contracts

```bash
cd Prompthub-smartcontract
cp .env.example .env
# Edit .env: add your PRIVATE_KEY

npm install
npm run compile
npm run deploy:0g-testnet
```

After deployment, copy the contract addresses from `deployments/0g-testnet.env` into the frontend and backend `.env` files.

### 2. Backend

```bash
cd Prompthub-backend
composer install
cp .env.example .env
# Edit .env: configure DB, contract addresses, 0G RPC

php artisan key:generate
php artisan migrate
php artisan serve
```

### 3. Frontend

```bash
cd Prompthub-frontend
npm install
cp .env.example .env
# Edit .env: add contract addresses, API URL

npm run dev
```

### 4. Wallet Setup

1. Install [MetaMask](https://metamask.io/)
2. The app will auto-prompt you to add the **0G Galileo Testnet** network
3. Get testnet 0G tokens from the [0G Faucet](https://faucet.0g.ai/)
4. Click **"Connect Wallet"** to authenticate

---

## Smart Contract Addresses

> After running `npm run deploy:0g-testnet`, addresses are saved to `Prompthub-smartcontract/deployments/0g-testnet.json`

| Contract | Description |
|----------|-------------|
| `PromptHubTreasury` | Platform fee collection |
| `PromptHubMarketplace` | ERC-721 NFT marketplace with versioning & royalties |
| `PromptHubEscrowHire` | P2P freelance escrow with dispute resolution |
| `PromptHubContests` | Multi-winner contest with on-chain prize pools |
| `AgentRegistry` | AI creator identity & reputation (ERC-7857 inspired) |

---

## Project Structure

```
prompthub-0g/
├── Prompthub-frontend/          # Next.js 16 frontend
│   ├── app/                     # App Router pages
│   ├── components/              # UI components (shadcn/ui)
│   ├── lib/                     # API, EVM, wallet context, contracts
│   └── .env                     # Frontend environment config
│
├── Prompthub-backend/           # Laravel 12 backend
│   ├── app/Http/Controllers/    # API controllers
│   ├── app/Models/              # Eloquent models
│   ├── app/Services/            # 0G Storage service
│   ├── database/migrations/     # DB schema
│   ├── config/0g.php            # 0G blockchain config
│   └── .env                     # Backend environment config
│
├── Prompthub-smartcontract/     # Hardhat + Solidity
│   ├── contracts/solidity/      # 5 Solidity contracts
│   ├── scripts/deploy.cjs       # Deployment script
│   ├── deployments/             # Deployment artifacts (post-deploy)
│   └── hardhat.config.cjs       # Hardhat config (0G Galileo)
│
└── README.md
```

---

## Bounty Alignment

### Best Infrastructure Use

- **5 smart contracts** deployed on 0G Galileo — not a token swap, a full application layer
- **0G Storage** for encrypted prompt data — using the chain's native storage, not external services
- **On-chain verification** via direct RPC calls to 0G node — backend is a thin verification layer, not a trust bottleneck
- Full Hardhat pipeline: compile, test, deploy — reproducible by any developer

### Most Innovative AI x Blockchain Use Case

- First platform to treat **AI prompts as financial assets** with ERC-721 ownership
- **AgentRegistry** (ERC-7857 inspired) — on-chain identity for AI agents, enabling future agent-to-agent commerce
- Content gating via on-chain ownership — only verified NFT holders can access prompt data
- Composable: prompts can be integrated into any 0G-based AI agent workflow

### Best Creator Experience

- **Web2 UX, Web3 ownership**: MetaMask login, one-click purchase, instant content delivery
- **2.5% fee** vs industry standard 20-30% — creators keep 97.5% of revenue
- Real-time dashboard with earnings analytics, not just a transaction list
- Built-in reputation system: reviews, ratings, follower counts — all tied to on-chain identity

---

## Vision

The AI economy needs infrastructure, not just marketplaces. PromptHub is building the **ownership layer** for AI intellectual property:

- **Today**: Creators mint, sell, and license prompts as on-chain assets
- **Next**: AI agents autonomously trade prompts via AgentRegistry
- **Future**: A composable economy where prompts, workflows, and AI models are all tradable on-chain assets on 0G

**PromptHub is not a marketplace with a blockchain bolted on. It's a blockchain-native economy designed from day one for AI creators.**

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with conviction for the <strong>0G Hackathon</strong>
</p>
