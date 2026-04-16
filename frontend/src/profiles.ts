import config from "./config.json";

export type UserProfile = {
  id: string;
  name: string;
  secret: string;
  poolAddress: string;
  backendUrl: string;
  token: string;
  amount: string;
  recipient: string;
};

const STORAGE_KEY = "private-defi-profiles-v2"; // Bumping version to avoid showing cached invalid addresses

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createProfile(partial: Omit<UserProfile, "id">): UserProfile {
  return { id: uid(), ...partial };
}

export function defaultProfile(): UserProfile {
  return {
    id: uid(),
    name: "Primary",
    secret: "",
    poolAddress: config.poolAddress,
    backendUrl: "http://localhost:8080",
    token: config.tokenAddress,
    amount: "100",
    recipient: "0x0000000000000000000000000000000000000000"
  };
}
