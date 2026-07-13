import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { createUserProfile } from "@/lib/create-user-profile";
import { isGreyOrangeEmail, normalizeEmail } from "@/lib/email-validation";
import { countModulesCovered } from "@/lib/progress";
import { fetchBackendJson } from "@/lib/backendApi";

type ExpandedUser = {
  uid: string;
  name: string;
  email: string;
  team: string;
  role: "admin" | "learner";
  certifications: unknown[];
  modulesCovered: number;
};

/**
 * GET /api/firebase/users
 *
 * Admin user-management listing. Returns every user with the fields the
 * Manage Program → User Management panel needs (the /rankings projection
 * omits email + role, so this is a dedicated admin view).
 */
export async function GET() {
  try {
    try {
      const { users } = await fetchBackendJson<{ users: ExpandedUser[] }>("/api/users?expand=full");
      return NextResponse.json({ users });
    } catch {
      // Fall through to Firestore below.
    }

    const snapshot = await getAdminDb().collection("users").get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data() ?? {};
      return {
        uid: doc.id,
        name: typeof data.name === "string" ? data.name : "",
        email: typeof data.email === "string" ? data.email : "",
        team: typeof data.team === "string" ? data.team : "",
        role: data.role === "admin" ? "admin" : "learner",
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        modulesCovered: countModulesCovered(data.progress?.done),
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type CreateBody = {
  name?: string;
  email?: string;
  password?: string;
  team?: string;
  role?: "admin" | "learner";
};

/**
 * POST /api/firebase/users
 *
 * Admin-driven user creation. Provisions a real Firebase Auth login
 * (email + password — this stays Firebase's job regardless of data store)
 * and creates the profile (backend-primary, Firestore-fallback) so the new
 * account can sign in and earn certifications immediately.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;
    const name = body.name?.trim();
    const team = body.team?.trim();
    const role = body.role === "admin" ? "admin" : "learner";
    const password = body.password ?? "";
    const email = body.email ? normalizeEmail(body.email) : "";

    if (!name || !email || !password || !team) {
      return NextResponse.json(
        { error: "name, email, password, and team are required." },
        { status: 400 }
      );
    }

    if (!isGreyOrangeEmail(email)) {
      return NextResponse.json(
        { error: "Please use a GreyOrange organization email (@greyorange.com)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Resolve the team's allowed level (matches the signup team-policy flow).
    let allowedLevel = 0;
    try {
      const policy = await fetchBackendJson<{ data: { allowed_level: number } }>(
        `/api/team_policies/${encodeURIComponent(team)}`
      );
      allowedLevel = policy.data.allowed_level;
    } catch {
      try {
        const teamDoc = await getAdminDb().collection("teamPolicies").doc(team).get();
        const teamData = teamDoc.data();
        if (teamDoc.exists && typeof teamData?.allowedLevel === "number") {
          allowedLevel = teamData.allowedLevel;
        }
      } catch {
        // Fall back to 0 if both lookups fail.
      }
    }

    let userRecord;
    try {
      userRecord = await getAdminAuth().createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authError) {
      const code = (authError as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }
      throw authError;
    }

    const uid = userRecord.uid;

    await createUserProfile({ uid, name, email, team, role, allowedLevel, allowedLevelSource: "team" });

    return NextResponse.json({ ok: true, uid }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
