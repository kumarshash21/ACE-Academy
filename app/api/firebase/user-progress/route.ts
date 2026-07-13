import { NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ScoreRecord } from "@/lib/progress";
import { fetchBackendJson } from "@/lib/backendApi";

type ProgressUpdateBody = {
  uid: string;
  moduleKey?: string;
  isDone?: boolean;
  done?: Record<string, string>;
  scores?: ScoreRecord[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProgressUpdateBody>;
    const { uid, moduleKey, isDone, done, scores } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    // `scores` has no Postgres home yet (unused elsewhere in the app) — go
    // straight to Firestore rather than silently dropping it.
    const scoresProvided = Array.isArray(scores);

    if (!scoresProvided && typeof moduleKey === "string" && moduleKey) {
      try {
        if (isDone) {
          await fetchBackendJson(
            `/api/progress/${encodeURIComponent(uid)}/${encodeURIComponent(moduleKey)}`,
            { method: "PUT", body: JSON.stringify({ completedAt: new Date().toISOString() }) }
          );
        } else {
          await fetchBackendJson(
            `/api/progress/${encodeURIComponent(uid)}/${encodeURIComponent(moduleKey)}`,
            { method: "DELETE" }
          );
        }
        return NextResponse.json({ ok: true });
      } catch {
        // Fall through to Firestore below.
      }
    }

    if (!scoresProvided && typeof done === "object" && done) {
      try {
        await Promise.all(
          Object.entries(done).map(([moduleCode, completedAt]) =>
            fetchBackendJson(
              `/api/progress/${encodeURIComponent(uid)}/${encodeURIComponent(moduleCode)}`,
              { method: "PUT", body: JSON.stringify({ completedAt }) }
            )
          )
        );
        return NextResponse.json({ ok: true, progress: { done, scores: [] } });
      } catch {
        // Fall through to Firestore below (all-or-nothing — no partial cross-store writes).
      }
    }

    const userRef = getAdminDb().collection("users").doc(uid);

    // Preferred path: flip exactly one module in place. This is an atomic
    // single-field write, so two toggles in flight at once (e.g. the user
    // marks one module done then quickly un-marks another) can never race
    // and clobber each other the way a client-side read-then-write of the
    // whole `done` map could. FieldPath (not a dotted string) is required
    // because module keys contain literal dots (module codes like "1.1.1"),
    // which Firestore would otherwise parse as further nested path segments.
    if (typeof moduleKey === "string" && moduleKey) {
      await userRef.update(
        new FieldPath("progress", "done", moduleKey),
        isDone ? new Date().toISOString() : FieldValue.delete(),
        "updatedAt",
        FieldValue.serverTimestamp()
      );
      return NextResponse.json({ ok: true });
    }

    // Legacy path: full-map replace. Dotted field paths replace the value at
    // that exact path instead of deep-merging into it. A plain
    // `set({ progress: { done } }, { merge: true })` recursively merges the
    // nested `done` map with whatever Firestore already stores there, so a
    // key omitted from a smaller `done` object (e.g. after un-marking a
    // module) is never actually removed — completed counts could only ever
    // go up.
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof done === "object" && done) updates["progress.done"] = done;
    if (Array.isArray(scores)) updates["progress.scores"] = scores;

    await userRef.set(updates, { merge: true });

    return NextResponse.json({
      ok: true,
      progress: { done, scores },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
