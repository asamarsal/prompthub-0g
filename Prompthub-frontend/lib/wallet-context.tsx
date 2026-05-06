"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { loginWithWallet, updateProfile as apiUpdateProfile, clearApiToken, clearAdminToken, fetchMe, type ProfileStats, type UserActivity } from "@/lib/api";
import { getBrowserProvider, ensure0GNetwork, getWalletBalance } from "@/lib/evm";
import { CHAIN_CONFIG } from "@/lib/contracts";

export type UserRole = "artist" | "brand" | "buyer";

export interface UserProfile {
  id?: number;
  username: string;
  name: string;
  bio: string;
  avatar: string;
  avatarUrl: string;
  coverImage: string;
  roles: UserRole[];
  activeRole: UserRole;
  isAvailableForFreelance: boolean;
  hourlyRate: number;
  hourlyRateCurrency: string;
  specialization_id: number[];
  specialties?: string[];
  stats?: ProfileStats;
  activities?: UserActivity[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  artist: "AI Artist",
  brand: "Brand",
  buyer: "Prompt Buyer",
};

export const ROLE_ICONS: Record<UserRole, string> = {
  artist: "A",
  brand: "B",
  buyer: "P",
};

const DEFAULT_PROFILE: UserProfile = {
  id: 0,
  username: "",
  name: "",
  bio: "",
  avatar: "",
  avatarUrl: "",
  coverImage: "",
  roles: [],
  activeRole: "buyer",
  isAvailableForFreelance: true,
  hourlyRate: 0.002,
  hourlyRateCurrency: "0G",
  specialization_id: [],
  specialties: [],
  stats: { rating: 0, projects: 0, reviews: 0, sold: 0 },
  activities: [],
};

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  network: "testnet" | "mainnet";
  profile: UserProfile;
  needsOnboarding: boolean;
}

interface WalletContextType extends WalletState {
  connect: (walletType?: string) => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  saveProfile: (profile: UserProfile) => void;
  switchRole: (role: UserRole) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = "prompthub_wallet_address";
const PROFILE_KEY = "prompthub_profile";

async function requestWalletAccounts(): Promise<string[]> {
  const ethereum = window.ethereum;
  if (!ethereum?.request) {
    throw new Error("Wallet provider not found. Please install MetaMask.");
  }

  try {
    await ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (error: any) {
    if (error?.code === 4001) throw error;
    // Some wallets do not support permission prompts; fall back below.
  }

  return ethereum.request({ method: "eth_requestAccounts" });
}

function revokeWalletPermissions() {
  const ethereum = window.ethereum;
  if (!ethereum?.request) return;

  ethereum.request({
    method: "wallet_revokePermissions",
    params: [{ eth_accounts: {} }],
  }).catch(() => {
    // Not every wallet supports EIP-2255 revoke; local session is still cleared.
  });
}

function normalizeNetwork(chainId?: number): "testnet" | "mainnet" {
  if (!chainId) return "testnet";
  return chainId === CHAIN_CONFIG.chainId ? "testnet" : "mainnet";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    network: "testnet",
    profile: DEFAULT_PROFILE,
    needsOnboarding: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const loadProfile = useCallback((): UserProfile => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw && raw.trim().startsWith("{")) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      }
    } catch {
      // ignore corrupted local profile
    }
    return DEFAULT_PROFILE;
  }, []);

  const syncProfileFromBackend = useCallback(async (localProfile: UserProfile): Promise<boolean> => {
    try {
      const user = await fetchMe();
      const merged: UserProfile = {
        ...DEFAULT_PROFILE,
        ...localProfile,
        username: user.username ?? localProfile.username,
        name: user.name ?? localProfile.name,
        bio: user.bio ?? localProfile.bio,
        avatarUrl: user.avatar_url ?? localProfile.avatarUrl,
        coverImage: user.cover_url ?? localProfile.coverImage,
        roles: (user.roles as UserRole[]) ?? localProfile.roles,
        activeRole: ((user.roles as UserRole[])?.[0]) ?? localProfile.activeRole ?? "buyer",
        isAvailableForFreelance: user.is_available_for_freelance ?? localProfile.isAvailableForFreelance ?? true,
        hourlyRate: (user.hourly_rate ? Number(user.hourly_rate) : null) ?? localProfile.hourlyRate ?? 0.002,
        hourlyRateCurrency: user.hourly_rate_currency ?? localProfile.hourlyRateCurrency ?? "0G",
        specialization_id: user.specialization_id ?? localProfile.specialization_id ?? [],
        specialties: user.specialties ?? localProfile.specialties ?? [],
        stats: user.stats ?? localProfile.stats ?? DEFAULT_PROFILE.stats,
        activities: user.activities ?? localProfile.activities ?? [],
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
      setWallet((w) => ({ ...w, profile: merged, needsOnboarding: merged.roles.length === 0 }));
      return true;
    } catch {
      setWallet((w) => ({ ...w, needsOnboarding: false }));
      return false;
    }
  }, []);

  const applyConnectedState = useCallback(async (address: string) => {
    const normalizedAddress = address.toLowerCase();
    const profile = loadProfile();
    const provider = await getBrowserProvider();
    const network = await provider.getNetwork();
    const balance = await getWalletBalance(normalizedAddress);

    setWallet((prev) => ({
      ...prev,
      isConnected: true,
      address: normalizedAddress,
      balance,
      network: normalizeNetwork(Number(network.chainId)),
      profile,
      needsOnboarding: false,
    }));
  }, [loadProfile]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const provider = await getBrowserProvider();
      const accounts = await requestWalletAccounts();
      const address = accounts?.[0]?.toLowerCase();
      if (!address) throw new Error("Wallet address not found");

      await ensure0GNetwork(provider);
      localStorage.setItem(STORAGE_KEY, address);
      await applyConnectedState(address);

      try {
        await loginWithWallet(address);
        await syncProfileFromBackend(loadProfile());
      } catch {
        // keep local session if API unavailable
      }
    } finally {
      setIsConnecting(false);
    }
  }, [applyConnectedState, loadProfile, syncProfileFromBackend]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    clearApiToken();
    clearAdminToken();
    revokeWalletPermissions();
    setWallet({
      isConnected: false,
      address: null,
      balance: 0,
      network: "testnet",
      profile: DEFAULT_PROFILE,
      needsOnboarding: false,
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const provider = await getBrowserProvider();
        const accounts: string[] = await provider.send("eth_accounts", []);
        const saved = localStorage.getItem(STORAGE_KEY);
        const currentAccount = accounts?.[0]?.toLowerCase();

        if (saved && (!currentAccount || saved.toLowerCase() !== currentAccount)) {
          disconnect();
          return;
        }

        const address = saved && saved.toLowerCase() === currentAccount ? saved : null;
        if (mounted && address) {
          const normalizedAddress = address.toLowerCase();
          localStorage.setItem(STORAGE_KEY, normalizedAddress);
          await applyConnectedState(normalizedAddress);
          await syncProfileFromBackend(loadProfile());
        }
      } catch {
        // provider not installed
      }
    };

    bootstrap();

    const eth = (typeof window !== "undefined" ? window.ethereum : null) as any;
    if (!eth?.on) return () => { mounted = false; };

    const onAccountsChanged = async (accounts: string[]) => {
      if (!accounts?.length) {
        disconnect();
        return;
      }
      const nextAddress = accounts[0].toLowerCase();
      const currentAddress = localStorage.getItem(STORAGE_KEY)?.toLowerCase();

      if (!currentAddress || currentAddress !== nextAddress) {
        disconnect();
        return;
      }

      await applyConnectedState(nextAddress);
    };

    const onChainChanged = async () => {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        await applyConnectedState(current);
      }
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);

    return () => {
      mounted = false;
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [applyConnectedState, disconnect, loadProfile, syncProfileFromBackend]);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setWallet((w) => ({ ...w, profile, needsOnboarding: false }));
    try {
      await apiUpdateProfile({
        username: profile.username,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatarUrl || undefined,
        cover_url: profile.coverImage || undefined,
        roles: profile.roles,
        is_available_for_freelance: profile.isAvailableForFreelance,
        hourly_rate: profile.hourlyRate,
        hourly_rate_currency: profile.hourlyRateCurrency,
        specialization_id: profile.specialization_id,
      });
    } catch {
      // non-blocking
    }
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setWallet((w) => {
      const updated = { ...w.profile, activeRole: role };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      return { ...w, profile: updated };
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...wallet, connect, disconnect, isConnecting, saveProfile, switchRole }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    return {
      isConnected: false,
      address: null,
      balance: 0,
      network: "testnet",
      profile: DEFAULT_PROFILE,
      needsOnboarding: false,
      connect: async () => {},
      disconnect: () => {},
      isConnecting: false,
      saveProfile: () => {},
      switchRole: () => {},
    };
  }
  return ctx;
}

export function truncateAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
