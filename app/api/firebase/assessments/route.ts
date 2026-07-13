import { NextResponse } from "next/server";
import { randomUUID } from "crypto"; // Use native Node.js crypto module
import { BackendApiError, fetchBackendJson } from "@/lib/backendApi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");

    // Scenario A: Fetch a specific quiz
    if (quizId) {
      try {
        const assessment = await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}`);
        return NextResponse.json(assessment);
      } catch (backendError) {
        if (backendError instanceof BackendApiError && backendError.status === 404) {
          return NextResponse.json({ error: `Assessment with ID '${quizId}' not found.` }, { status: 404 });
        }
        throw backendError;
      }
    }

    // Scenario B: Fetch all quizzes if no specific quizId is provided
    const { assessments } = await fetchBackendJson<{ assessments: unknown[] }>("/api/assessments");
    return NextResponse.json({ assessments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type Question = {
  id: string; // Unique identifier for each question
  questionText: string;
  options: string[];
  correctAnswer: string;
};

// Input type might not include the ID yet if it's coming from a frontend form
type IncomingQuestion = Omit<Question, "id"> & { id?: string };

type AssessmentPayload = {
  quizId:
    | "ttp-pathfinder" | "ttp-navigator" | "ttp-grandmaster"
    | "rtp-navigator" | "rtp-grandmaster" | "rtp-pathfinder"
    | "tools-specialist"
  totalMarks: number;
  passingPercentage: number;
  timeLimit: number;
  questions: IncomingQuestion[]; // Accepts questions with or without IDs initially
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AssessmentPayload;
    const { quizId, totalMarks, passingPercentage, timeLimit, questions } = body;

    // Validate allowed quiz IDs
    const validIds = [
      "ttp-pathfinder", "ttp-navigator", "ttp-grandmaster",
      "rtp-navigator", "rtp-grandmaster", "rtp-pathfinder",
      "tools-specialist"
    ];
    if (!quizId || !validIds.includes(quizId)) {
      return NextResponse.json(
        { error: "Invalid or missing quizId. Must be one of the allowed quiz IDs." },
        { status: 400 }
      );
    }

    // Validate remaining fields
    if (totalMarks === undefined || passingPercentage === undefined || timeLimit === undefined || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Missing required fields: totalMarks, passingPercentage, timeLimit, or questions array." },
        { status: 400 }
      );
    }

    // Map over questions to ensure every single one has a unique ID natively
    const questionsWithIds: Question[] = questions.map((q) => ({
      ...q,
      id: q.id || randomUUID(), // Uses existing unique ID if provided, otherwise generates a standard native UUIDv4
    }));

    await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}`, {
      method: "PUT",
      body: JSON.stringify({ totalMarks, passingPercentage, timeLimit, questions: questionsWithIds }),
    });
    return NextResponse.json({ ok: true, message: `Assessment '${quizId}' successfully updated/created.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
