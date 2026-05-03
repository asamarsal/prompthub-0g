import { BrowserProvider, Contract, formatEther } from "ethers";
import { CHAIN_CONFIG, CONTRACTS } from "@/lib/contracts";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const MARKETPLACE_ABI = [
  "event PromptListed(uint256 indexed tokenId, address indexed creator, uint256 price, string storageHash, string metadataUri)",
  "event PromptVersioned(uint256 indexed tokenId, uint256 indexed version, string storageHash, string metadataUri, address indexed updater)",
  "function listPrompt(string metadataUri, uint256 price, uint256 royaltyPerMille, string storageHash) returns (uint256)",
  "function createPromptVersion(uint256 tokenId, string newMetadataUri, string newStorageHash)",
  "function getPromptVersionCount(uint256 tokenId) view returns (uint256)",
  "function totalPrompts() view returns (uint256)",
  "function buyPrompt(uint256 tokenId) payable",
  "function relistPrompt(uint256 tokenId, uint256 newPrice)",
  "function updatePrice(uint256 tokenId, uint256 newPrice)",
  "function delistPrompt(uint256 tokenId)",
  "function rateCreator(uint256 tokenId, uint256 rating)",
] as const;

export const CONTESTS_ABI = [
  "event ContestFunded(uint256 indexed contestId, address indexed brand, uint256 totalPool, uint256 numTiers)",
  "function fundContest(uint256 numTiers, uint256[] amounts, uint256 deadline) payable returns (uint256)",
  "function submitEntry(uint256 contestId, string entryId)",
  "function declareWinner(uint256 contestId, uint256 place, address winner)",
] as const;

export const ESCROW_ABI = [
  "event JobCreated(uint256 indexed jobId, address indexed client, address indexed artist, uint256 amount)",
  "event JobCompleted(uint256 indexed jobId, address indexed artist, uint256 payout)",
  "function createJob(address artist) payable returns (uint256)",
  "function completeJob(uint256 jobId)",
  "function getJob(uint256 jobId) view returns (tuple(address client, address artist, uint256 amount, uint8 status, uint256 createdAt))",
] as const;

export const AGENT_REGISTRY_ABI = [
  "event AgentRegistered(address indexed agent, string metadataUri)",
  "event AgentVerified(address indexed agent)",
  "function registerAgent(string metadataUri)",
  "function updateMetadata(string metadataUri)",
  "function isVerified(address agent) view returns (bool)",
  "function isRegistered(address agent) view returns (bool)",
  "function getReputation(address agent) view returns (bool verified, uint256 avgRating, uint256 completedJobs, uint256 totalReviews)",
  "function getMetadataUri(address agent) view returns (string)",
] as const;

export async function getBrowserProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Wallet provider not found. Please install MetaMask.");
  }
  return new BrowserProvider(window.ethereum);
}

export function chainIdHex(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

export async function ensure0GNetwork(provider: BrowserProvider) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) === CHAIN_CONFIG.chainId) return;

  const chainHex = chainIdHex(CHAIN_CONFIG.chainId);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (err: any) {
    if (err?.code !== 4902) throw err;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainHex,
          chainName: CHAIN_CONFIG.chainName,
          rpcUrls: [CHAIN_CONFIG.rpcUrl],
          nativeCurrency: CHAIN_CONFIG.currency,
          blockExplorerUrls: [CHAIN_CONFIG.explorer],
        },
      ],
    });
  }
}

export async function getSigner() {
  const provider = await getBrowserProvider();
  await ensure0GNetwork(provider);
  const signer = await provider.getSigner();
  return { provider, signer };
}

export async function getWalletBalance(address: string) {
  const provider = await getBrowserProvider();
  const wei = await provider.getBalance(address);
  return Number(formatEther(wei));
}

export async function getMarketplaceContract() {
  if (!CONTRACTS.marketplace) throw new Error("Marketplace address not configured");
  const { signer } = await getSigner();
  return new Contract(CONTRACTS.marketplace, MARKETPLACE_ABI, signer);
}

export async function getContestsContract() {
  if (!CONTRACTS.contests) throw new Error("Contests address not configured");
  const { signer } = await getSigner();
  return new Contract(CONTRACTS.contests, CONTESTS_ABI, signer);
}

export async function getEscrowContract() {
  if (!CONTRACTS.escrowHire) throw new Error("Escrow address not configured");
  const { signer } = await getSigner();
  return new Contract(CONTRACTS.escrowHire, ESCROW_ABI, signer);
}

export async function getAgentRegistryContract() {
  if (!CONTRACTS.agentRegistry) throw new Error("AgentRegistry address not configured");
  const { signer } = await getSigner();
  return new Contract(CONTRACTS.agentRegistry, AGENT_REGISTRY_ABI, signer);
}

export async function getAgentRegistryReadOnly() {
  if (!CONTRACTS.agentRegistry) return null;
  const provider = await getBrowserProvider();
  return new Contract(CONTRACTS.agentRegistry, AGENT_REGISTRY_ABI, provider);
}

export async function checkAgentVerified(address: string): Promise<boolean> {
  try {
    const registry = await getAgentRegistryReadOnly();
    if (!registry) return false;
    return await registry.isVerified(address);
  } catch {
    return false;
  }
}

export async function checkAgentRegistered(address: string): Promise<boolean> {
  try {
    const registry = await getAgentRegistryReadOnly();
    if (!registry) return false;
    return await registry.isRegistered(address);
  } catch {
    return false;
  }
}

export interface AgentReputation {
  verified: boolean;
  avgRating: number;
  completedJobs: number;
  totalReviews: number;
}

export async function getAgentReputation(address: string): Promise<AgentReputation | null> {
  try {
    const registry = await getAgentRegistryReadOnly();
    if (!registry) return null;
    const [verified, avgRating, completedJobs, totalReviews] = await registry.getReputation(address);
    return {
      verified,
      avgRating: Number(avgRating),
      completedJobs: Number(completedJobs),
      totalReviews: Number(totalReviews),
    };
  } catch {
    return null;
  }
}
