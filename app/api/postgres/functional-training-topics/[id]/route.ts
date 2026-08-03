import { NextResponse } from "next/server";
import { fetchBackendJson, BackendApiError } from "@/lib/backendApi";

type PatchBody = {
  team?: string;
  title?: string;
  sortOrder?: number;
};

/**
 * PATCH /api/postgres/functional-training-topics/[id]
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as PatchBody;

    const hasValidField =
      (typeof body.team === "string" && body.team.trim()) ||
      (typeof body.title === "string" && body.title.trim()) ||
      typeof body.sortOrder === "number";

    if (!hasValidField) {
      return NextResponse.json(
        { error: "No valid fields to update (team, title, or sortOrder)." },
        { status: 400 }
      );
    }

    const result = await fetchBackendJson(`/api/functional_training_topics/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return NextResponse.json({ error: "Functional training topic not found." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/postgres/functional-training-topics/[id]
 *
 * Cascades to delete every module under this topic.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await fetchBackendJson(`/api/functional_training_topics/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return NextResponse.json({ error: "Functional training topic not found." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
