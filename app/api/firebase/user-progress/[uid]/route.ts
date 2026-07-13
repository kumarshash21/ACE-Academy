import { NextResponse } from "next/server";
import type { ProgressSnapshot } from "@/lib/progress";
import { fetchBackendJson } from "@/lib/backendApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "uid is required." }, { status: 400 });
    }

    const snapshot = await fetchBackendJson<ProgressSnapshot>(
      `/api/progress/${encodeURIComponent(uid)}`
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
