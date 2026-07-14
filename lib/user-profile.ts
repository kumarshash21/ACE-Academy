import type { CertificationModule } from "@/lib/certifications";
import { apiUrl } from "@/lib/api";

/** Firestore timestamp or ISO string from signup */
export type FirestoreTimestamp =
  | string
  | {
      _seconds: number;
      _nanoseconds: number;
    };

export type UserProgressSnapshot = {
  scores?: unknown[];
  done?: Record<string, string>;
};

/**
 * User document from GET /api/postgres/user/[uid]
 * (matches Firestore `users/{uid}` — see signup + sample profile JSON)
 */
export type FirestoreUserProfile = {
  uid: string;
  name: string;
  email: string;
  team: string;
  role: "admin" | "learner";
  level?: number;
  allowedLevel?: number;
  allowedLevelSource?: string;
  certifications?: CertificationModule[];
  progress?: UserProgressSnapshot;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export function isFirestoreUserProfile(value: unknown): value is FirestoreUserProfile {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.uid === "string" &&
    typeof record.name === "string" &&
    typeof record.email === "string" &&
    typeof record.team === "string" &&
    (record.role === "admin" || record.role === "learner")
  );
}

export async function fetchUserProfile(uid: string): Promise<{
  profile: FirestoreUserProfile | null;
  error: "profile_not_found" | "fetch_failed" | null;
}> {
  const response = await fetch(apiUrl(`/api/postgres/user/${encodeURIComponent(uid)}`));

  if (response.status === 404) {
    return { profile: null, error: "profile_not_found" };
  }

  if (!response.ok) {
    return { profile: null, error: "fetch_failed" };
  }

  const data = (await response.json()) as unknown;

  if (!isFirestoreUserProfile(data)) {
    return { profile: null, error: "fetch_failed" };
  }

  return {
    profile: {
      ...data,
      uid: data.uid || uid,
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
    },
    error: null,
  };
}
