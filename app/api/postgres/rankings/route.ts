import { NextResponse } from "next/server";
import { fetchBackendJson } from "@/lib/backendApi";

type ExpandedUser = {
  uid: string;
  name: string;
  team: string;
  role: "admin" | "learner";
  av: string;
  certifications: unknown[];
};

/**
 * GET /api/postgres/rankings
 *
 * Returns a compact projection of every user for the dashboard ranking cards.
 * The client (legacy index.html) does all filtering/sorting/top-5 in the browser,
 * so tab/level/team switches re-render instantly without another round trip.
 */
export async function GET() {
  try {
    const { users } = await fetchBackendJson<{ users: ExpandedUser[] }>("/api/users?expand=full");
    return NextResponse.json({
      users: users.map(({ uid, name, team, role, av, certifications }) => ({
        uid,
        name,
        team,
        role,
        av,
        certifications,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
