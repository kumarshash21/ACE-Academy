import { NextRequest, NextResponse } from "next/server";
import { fetchBackendJson } from "@/lib/backendApi";

/**
 * GET /api/postgres/functional-training?team=<team>
 *
 * Lists functional training links, optionally filtered by team.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");

    const query = team ? `?team=${encodeURIComponent(team)}` : "";
    const result = await fetchBackendJson(`/api/functional_trainings${query}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type CreateBody = {
  team?: string;
  title?: string;
  link?: string;
  sortOrder?: number;
};

/**
 * POST /api/postgres/functional-training
 *
 * Admin-created training link, body: { team, title, link, sortOrder? }.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBody;

    if (!body.team?.trim() || !body.title?.trim() || !body.link?.trim()) {
      return NextResponse.json(
        { error: "team, title, and link are required." },
        { status: 400 }
      );
    }

    const result = await fetchBackendJson("/api/functional_trainings", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
