import { NextResponse } from "next/server";
import { fetchBackendJson, BackendApiError } from "@/lib/backendApi";

type PatchBody = {
  team?: string;
  title?: string;
  link?: string;
  sortOrder?: number;
};

/**
 * PATCH /api/postgres/functional-training/[id]
 *
 * Admin edit of a training link's team, title, link, or sort order.
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
      (typeof body.link === "string" && body.link.trim()) ||
      typeof body.sortOrder === "number";

    if (!hasValidField) {
      return NextResponse.json(
        { error: "No valid fields to update (team, title, link, or sortOrder)." },
        { status: 400 }
      );
    }

    const result = await fetchBackendJson(`/api/functional_trainings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return NextResponse.json({ error: "Functional training not found." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/postgres/functional-training/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await fetchBackendJson(`/api/functional_trainings/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return NextResponse.json({ error: "Functional training not found." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
