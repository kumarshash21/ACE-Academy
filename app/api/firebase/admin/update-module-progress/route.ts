import { NextRequest, NextResponse } from "next/server";
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
    const { uid, updates } = body;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
