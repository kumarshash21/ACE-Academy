import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchBackendJson } from "@/lib/backendApi";

type SyllabusPayload = {
  id?: string;
  product?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyllabusPayload;
    const id = body.id || (body.product as any)?.id;

    if (!id || !body.product || typeof body.product !== "object") {
      return NextResponse.json(
        { error: "id and product payload are required." },
        { status: 400 }
      );
    }

    try {
      await fetchBackendJson(`/api/courses/${encodeURIComponent(id)}/syllabus`, {
        method: "PUT",
        body: JSON.stringify(body.product),
      });
      return NextResponse.json({ ok: true, id, product: body.product });
    } catch {
      // Fall through to Firestore below.
    }

    await getAdminDb()
      .collection("syllabi")
      .doc(id)
      .set(
        {
          ...body.product,
          id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true, id, product: body.product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
