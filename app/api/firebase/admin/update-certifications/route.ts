import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { CertificationModule } from "@/lib/certifications";
import { fetchBackendJson } from "@/lib/backendApi";

type Body = {
  uid: string;
  certifications: unknown[];
  updatedBy?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;
    const { uid, certifications, updatedBy } = body;

    if (!uid || !Array.isArray(certifications)) {
      return NextResponse.json(
        { error: "uid and certifications array are required." },
        { status: 400 }
      );
    }

    try {
      const modules = certifications as CertificationModule[];
      await Promise.all(
        modules.flatMap((mod) =>
          (mod.levels ?? []).map((level) =>
            fetchBackendJson(
              `/api/certifications/${encodeURIComponent(uid)}/${encodeURIComponent(mod.module_name)}/${encodeURIComponent(level.level_name)}`,
              {
                method: "PUT",
                body: JSON.stringify({
                  status: level.status,
                  score: level.score,
                  attemptedTime: level.attemptedTime,
                  noOfAttempts: level.noOfAttempts,
                  lastAttemptDate: level.lastAttemptDate,
                  completedAt: level.completedAt,
                }),
              }
            )
          )
        )
      );
    } catch {
      const userRef = getAdminDb().collection("users").doc(uid);
      await userRef.set(
        {
          certifications,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: updatedBy ?? "admin",
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      uid,
      certifications,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
