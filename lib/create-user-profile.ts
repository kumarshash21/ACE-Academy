import { fetchBackendJson } from "@/lib/backendApi";

export type CreateUserProfileInput = {
  uid: string;
  name: string;
  email: string;
  team: string;
  role: "admin" | "learner";
  allowedLevel: number;
  allowedLevelSource?: string;
};

/**
 * Creates a user's profile row in Postgres. Does not touch Firebase Auth —
 * callers are responsible for creating (or already having) the Auth user
 * with this uid.
 */
export async function createUserProfile(input: CreateUserProfileInput): Promise<void> {
  const { uid, name, email, team, role, allowedLevel } = input;
  const allowedLevelSource = input.allowedLevelSource ?? "team";

  await fetchBackendJson(`/api/users`, {
    method: "POST",
    body: JSON.stringify({ id: uid, name, email, team, role, allowedLevel, allowedLevelSource }),
  });
}
