import type { FirestoreUserProfile } from "@/lib/user-profile";

const SESSION_KEY = "ace2_session_user";

export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  name: string;
  email?: string;
  team: string;
  role: "admin" | "learner";
  av: string;
  level?: number;
  allowedLevel?: number;
  certifications?: FirestoreUserProfile["certifications"];
  loginAt?: number;
};

export function isSessionExpired(session: { loginAt?: number } | null | undefined): boolean {
  if (!session || typeof session.loginAt !== "number") return false;
  return Date.now() - session.loginAt > SESSION_MAX_AGE_MS;
}

// Clears the stored session if its 24hr limit has passed. Returns true if it was cleared.
export function clearSessionIfExpired(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (isSessionExpired(parsed)) {
      window.localStorage.removeItem(SESSION_KEY);
      return true;
    }
    return false;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return false;
  }
}

export function getSessionUid(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { id?: string };
    return typeof session?.id === "string" ? session.id : null;
  } catch {
    return null;
  }
}

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "LN"
  );
}

export function syncSessionFromProfile(profile: FirestoreUserProfile): void {
  if (typeof window === "undefined") return;

  let loginAt: number | undefined;
  try {
    const existingRaw = window.localStorage.getItem(SESSION_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as { loginAt?: number }) : null;
    if (existing && typeof existing.loginAt === "number") loginAt = existing.loginAt;
  } catch {
    // Ignore malformed existing session; falls back to a fresh timestamp below.
  }

  const session: SessionUser = {
    id: profile.uid,
    name: profile.name,
    email: profile.email,
    team: profile.team,
    role: profile.role,
    av: initialsFromName(profile.name),
    level: profile.level,
    allowedLevel: profile.allowedLevel,
    certifications: profile.certifications,
    loginAt: loginAt ?? Date.now(),
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
