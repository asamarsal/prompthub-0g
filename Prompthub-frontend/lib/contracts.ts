export const CONTRACTS = {
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "",
  marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "",
  escrowHire: process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "",
  contests: process.env.NEXT_PUBLIC_CONTESTS_ADDRESS || "",
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "",
};

export const CHAIN_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 16602),
  chainName: "0G-Testnet-Galileo",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://evmrpc-testnet.0g.ai",
  explorer:
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://chainscan-galileo.0g.ai",
  currency: { name: "0G", symbol: "0G", decimals: 18 },
};

export function assertContractsConfigured() {
  const missing = Object.entries(CONTRACTS)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return { ok: missing.length === 0, missing };
}
