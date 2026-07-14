import { NextResponse } from "next/server";
import { fetchBackendJson } from "@/lib/backendApi";

type ProgressUpdateBody = {
  uid: string;
  moduleKey?: string;
  isDone?: boolean;
  done?: Record<string, string>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProgressUpdateBody>;
    const { uid, moduleKey, isDone, done } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    if (typeof moduleKey === "string" && moduleKey) {
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
    }

    if (typeof done === "object" && done) {
      await Promise.all(
        Object.entries(done).map(([moduleCode, completedAt]) =>
          fetchBackendJson(
            `/api/progress/${encodeURIComponent(uid)}/${encodeURIComponent(moduleCode)}`,
            { method: "PUT", body: JSON.stringify({ completedAt }) }
          )
        )
      );
      return NextResponse.json({ ok: true, progress: { done, scores: [] } });
    }

    return NextResponse.json({ error: "moduleKey or done is required." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
