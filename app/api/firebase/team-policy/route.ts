import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchBackendJson } from "@/lib/backendApi";

const PERSONA_CERTS: Record<string, string[]> = {
  TAC: ["pathfinder", "navigator", "grandmaster", "toolscert"],
  "Change Management": ["pathfinder", "navigator", "toolscert"],
  "Client Director": ["pathfinder", "navigator", "toolscert"],
  CEM: ["pathfinder", "toolscert"],
  CAC: ["pathfinder", "toolscert"],
  IM: ["pathfinder", "toolscert"],
  Management: ["pathfinder", "toolscert"],
  default: ["pathfinder", "navigator", "grandmaster", "toolscert"],
};

function getAllowedLevelCount(team: string) {
  const allowed = PERSONA_CERTS[team] || PERSONA_CERTS.default;
  return allowed.filter((cert) => cert !== "toolscert").length;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");

    if (!team) {
      return NextResponse.json({ error: "team query parameter is required." }, { status: 400 });
    }

    const allowedLevelCount = getAllowedLevelCount(team);
    const allowedCerts = PERSONA_CERTS[team] || PERSONA_CERTS.default;

    try {
      const policy = await fetchBackendJson<{ data: { allowed_level: number } }>(
        `/api/team_policies/${encodeURIComponent(team)}`
      );
      return NextResponse.json({
        team,
        allowedLevel: Math.min(policy.data.allowed_level, allowedLevelCount),
        certifications: allowedCerts,
      });
    } catch {
      // Not yet migrated, or a backend/network failure — fall through to Firestore.
    }

    const teamDoc = await getAdminDb().collection("teamPolicies").doc(team).get();

    if (!teamDoc.exists) {
      return NextResponse.json({
        team,
        allowedLevel: allowedLevelCount,
        certifications: allowedCerts,
      }, { status: 200 });
    }

    const data = teamDoc.data();
    return NextResponse.json({
      team,
      allowedLevel: typeof data?.allowedLevel === "number"
        ? Math.min(data.allowedLevel, allowedLevelCount)
        : allowedLevelCount,
      certifications: allowedCerts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
