import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { BackendApiError, fetchBackendJson } from "@/lib/backendApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    try {
      const profile = await fetchBackendJson(`/api/users/${encodeURIComponent(uid)}/profile`);
      return NextResponse.json(profile);
    } catch (backendError) {
      if (backendError instanceof BackendApiError && backendError.status === 404) {
        return NextResponse.json({ error: "User profile not found." }, { status: 404 });
      }
      throw backendError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PatchBody = {
  name?: string;
  role?: "admin" | "learner";
  team?: string;
};

/**
 * PATCH /api/firebase/user/[uid]
 *
 * Admin edit of a user's identity/access fields (name, role, team).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;

    const hasValidField =
      (typeof body.name === "string" && body.name.trim()) ||
      body.role === "admin" ||
      body.role === "learner" ||
      (typeof body.team === "string" && body.team.trim());

    if (!hasValidField) {
      return NextResponse.json(
        { error: "No valid fields to update (name, role, or team)." },
        { status: 400 }
      );
    }

    await fetchBackendJson(`/api/users/${encodeURIComponent(uid)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    // Keep the Auth display name in sync with the profile update.
    if (typeof body.name === "string" && body.name.trim()) {
      try {
        await getAdminAuth().updateUser(uid, { displayName: body.name.trim() });
      } catch {
        // Auth record may not exist for legacy/Firestore-only users — ignore.
      }
    }

    return NextResponse.json({ ok: true, uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/firebase/user/[uid]
 *
 * Removes the user's Postgres profile and the Firebase Auth login.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    await fetchBackendJson(`/api/users/${encodeURIComponent(uid)}`, { method: "DELETE" });

    try {
      await getAdminAuth().deleteUser(uid);
    } catch (authError) {
      const code = (authError as { code?: string })?.code;
      // Tolerate a missing Auth record (already-removed user).
      if (code !== "auth/user-not-found") {
        throw authError;
      }
    }

    return NextResponse.json({ ok: true, uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
