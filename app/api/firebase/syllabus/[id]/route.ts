import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchBackendJson } from "@/lib/backendApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Syllabus id is required." }, { status: 400 });
    }

    try {
      const syllabus = await fetchBackendJson(`/api/courses/${encodeURIComponent(id)}/syllabus`);
      return NextResponse.json(syllabus, { headers: { "x-syllabus-source": "postgres" } });
    } catch {
      // Any backend failure, including 404 (course not yet migrated to
      // Postgres) — fall through to Firestore rather than assuming the
      // course doesn't exist at all.
    }

    const doc = await getAdminDb().collection("syllabi").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
    }

    return NextResponse.json(doc.data(), { headers: { "x-syllabus-source": "firestore" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
