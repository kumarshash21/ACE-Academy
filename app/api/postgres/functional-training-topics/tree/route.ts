import { NextRequest, NextResponse } from "next/server";
import { fetchBackendJson } from "@/lib/backendApi";

/**
 * GET /api/postgres/functional-training-topics/tree?team=<team>
 *
 * Every topic (optionally scoped to one team) with its modules nested
 * inside. Team omitted -> every team's topics, used by the manageprogram
 * admin tab; team given -> just that team, used by the Functional Training
 * page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");

    const query = team ? `?team=${encodeURIComponent(team)}` : "";
    const result = await fetchBackendJson(`/api/functional_training_topics/tree${query}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
