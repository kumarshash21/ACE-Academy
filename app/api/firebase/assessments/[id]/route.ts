import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { BackendApiError, fetchBackendJson } from "@/lib/backendApi";

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
      const assessment = await fetchBackendJson(`/api/assessments/${encodeURIComponent(id)}`);
      return NextResponse.json(assessment);
    } catch (backendError) {
      if (backendError instanceof BackendApiError && backendError.status === 404) {
        return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
      }
      // Any other backend failure — fall through to Firestore.
    }

    const doc = await getAdminDb().collection("assessments").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
