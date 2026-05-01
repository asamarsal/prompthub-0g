# PromptHub 0G Deployment Runbook

## Prerequisites
- Node.js 18+
- `.env` file in `Prompthub-smartcontract`:
  - `RPC_URL=https://evmrpc-testnet.0g.ai`
  - `PRIVATE_KEY=0x...`

## Install
```bash
cd Prompthub-smartcontract
npm install
```

## Compile
```bash
npm run compile
```

## Deploy to 0G testnet
```bash
npm run deploy:0g-testnet
```

## Outputs
Deployment script writes:
- `deployments/0g-testnet.json` (addresses + metadata)
- `deployments/0g-testnet.env` (frontend env snippet)

## Frontend Env Update
Copy values to `Prompthub-frontend/.env`:
```env
NEXT_PUBLIC_TREASURY_ADDRESS=...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=...
NEXT_PUBLIC_ESCROW_ADDRESS=...
NEXT_PUBLIC_CONTESTS_ADDRESS=...
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=...
```

## Rollback Notes
- If one deployment tx fails, re-run full deploy from clean wallet nonce sequence.
- Treat partially deployed addresses as invalid unless full set (5 contracts) exists.
- Never mix addresses from different runs in one environment.

## Post-Deploy Smoke Checks
1. Call `PromptHubMarketplace.totalPrompts()` => `0`.
2. Call `PromptHubTreasury.getBalance()` => `0`.
3. Call `AgentRegistry.isRegistered(<deployer>)` => `false`.
