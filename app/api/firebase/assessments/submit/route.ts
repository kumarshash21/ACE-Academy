import { NextResponse } from "next/server";
import { VALID_QUIZ_IDS } from "@/lib/assessment-mapping";
import { fetchBackendJson } from "@/lib/backendApi";

type SubmitBody = {
  uid?: string;
  quizId?: string;
  score?: number;
  attemptedTimeSeconds?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitBody;
    const { uid, quizId, score, attemptedTimeSeconds } = body;

    if (!uid || !quizId || typeof score !== "number" || typeof attemptedTimeSeconds !== "number") {
      return NextResponse.json(
        { error: "uid, quizId, score, and attemptedTimeSeconds are required." },
        { status: 400 }
      );
    }

    if (!VALID_QUIZ_IDS.includes(quizId)) {
      return NextResponse.json({ error: `Invalid quizId: ${quizId}` }, { status: 400 });
    }

    if (score < 0 || score > 100) {
      return NextResponse.json({ error: "score must be between 0 and 100." }, { status: 400 });
    }

    if (attemptedTimeSeconds < 0) {
      return NextResponse.json({ error: "attemptedTimeSeconds must be non-negative." }, { status: 400 });
    }

    const result = await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}/submit`, {
      method: "POST",
      body: JSON.stringify({ user_id: uid, score, attemptedTimeSeconds }),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const status = message.includes("not found") || message.includes("locked") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
