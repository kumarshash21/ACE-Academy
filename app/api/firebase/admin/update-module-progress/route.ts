import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchBackendJson } from "@/lib/backendApi";

type ModuleProgressUpdate = {
  levelName: string;
  moduleName: string;
  score?: number;
  status?: "not_started" | "in_progress" | "completed" | "locked";
  noOfAttempts?: number;
  lastAttemptDate?: string | null;
  attemptedTime?: number;
};

type RequestBody = {
  uid: string;
  updates: ModuleProgressUpdate[];
  updatedBy?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const { uid, updates, updatedBy } = body;

    if (!uid || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "uid and updates array are required." },
        { status: 400 }
      );
    }

    for (const update of updates) {
      if (!update.levelName || !update.moduleName) {
        return NextResponse.json(
          { error: "Each update must have levelName and moduleName." },
          { status: 400 }
        );
      }
    }

    try {
      await Promise.all(
        updates.map((update) =>
          fetchBackendJson(
            `/api/certifications/${encodeURIComponent(uid)}/${encodeURIComponent(update.moduleName)}/${encodeURIComponent(update.levelName)}`,
            {
              method: "PUT",
              body: JSON.stringify({
                score: update.score,
                status: update.status,
                noOfAttempts: update.noOfAttempts,
                lastAttemptDate: update.lastAttemptDate,
                attemptedTime: update.attemptedTime,
              }),
            }
          )
        )
      );

      return NextResponse.json({ ok: true, message: "Module progress updated successfully." });
    } catch {
      // Fall through to Firestore below.
    }

    const userDoc = await getAdminDb().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    let certifications = userData?.certifications || [];

    for (const update of updates) {
      certifications = certifications.map((cert: any) => {
        if (cert.module_name !== update.moduleName) {
          return cert;
        }

        return {
          ...cert,
          levels: Array.isArray(cert.levels)
            ? cert.levels.map((level: any) => {
                if (level.level_name !== update.levelName) {
                  return level;
                }

                return {
                  ...level,
                  ...(update.score !== undefined && { score: update.score }),
                  ...(update.status !== undefined && { status: update.status }),
                  ...(update.noOfAttempts !== undefined && { noOfAttempts: update.noOfAttempts }),
                  ...(update.lastAttemptDate !== undefined && { lastAttemptDate: update.lastAttemptDate }),
                  ...(update.attemptedTime !== undefined && { attemptedTime: update.attemptedTime }),
                };
              })
            : cert.levels,
        };
      });
    }

    await getAdminDb()
      .collection("users")
      .doc(uid)
      .update({
        certifications,
        lastModifiedBy: updatedBy || "system",
        updatedAt: new Date().toISOString(),
      });

    return NextResponse.json({
      ok: true,
      message: "Module progress updated successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
