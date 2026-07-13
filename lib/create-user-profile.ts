import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { createInitialCertifications } from "@/lib/certifications";
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
 * Creates a user's profile row: Postgres-primary via the backend API,
 * Firestore-fallback if the backend is unreachable. Does not touch Firebase
 * Auth — callers are responsible for creating (or already having) the Auth
 * user with this uid.
 */
export async function createUserProfile(input: CreateUserProfileInput): Promise<void> {
  const { uid, name, email, team, role, allowedLevel } = input;
  const allowedLevelSource = input.allowedLevelSource ?? "team";

  try {
    await fetchBackendJson(`/api/users`, {
      method: "POST",
      body: JSON.stringify({ id: uid, name, email, team, role, allowedLevel, allowedLevelSource }),
    });
  } catch {
    await getAdminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          name,
          email,
          team,
          role,
          level: 0,
          allowedLevel,
          allowedLevelSource,
          certifications: createInitialCertifications(allowedLevel),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }
}
