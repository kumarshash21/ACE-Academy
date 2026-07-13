import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchBackendJson } from "@/lib/backendApi";

type Body = {
  uid: string;
  allowedLevel: number;
  updatedBy?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Body>;
    const { uid, allowedLevel, updatedBy } = body;

    if (!uid || typeof allowedLevel !== "number") {
      return NextResponse.json(
        { error: "uid and allowedLevel are required." },
        { status: 400 }
      );
    }

    try {
      await fetchBackendJson(`/api/users/${encodeURIComponent(uid)}`, {
        method: "PATCH",
        body: JSON.stringify({ allowedLevel, allowedLevelSource: "individual", updatedBy }),
      });
    } catch {
      const userRef = getAdminDb().collection("users").doc(uid);
      await userRef.set(
        {
          allowedLevel,
          allowedLevelSource: "individual",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: updatedBy ?? "admin",
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      ok: true,
      uid,
      allowedLevel,
      allowedLevelSource: "individual",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
