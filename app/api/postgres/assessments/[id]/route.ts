import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { BackendApiError, fetchBackendJson } from "@/lib/backendApi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Assessment id is required." }, { status: 400 });
    }

    try {
      const assessment = await fetchBackendJson(`/api/assessments/${encodeURIComponent(id)}`);
      return NextResponse.json(assessment);
    } catch (backendError) {
      if (backendError instanceof BackendApiError && backendError.status === 404) {
        return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
      }
      throw backendError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type Question = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
};

type IncomingQuestion = Omit<Question, "id"> & { id?: string };

type AssessmentPayload = {
  totalMarks: number;
  passingPercentage: number;
  timeLimit: number;
  questions: IncomingQuestion[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Assessment id is required." }, { status: 400 });
    }

    const body = (await request.json()) as AssessmentPayload;
    const { totalMarks, passingPercentage, timeLimit, questions } = body;

    if (totalMarks === undefined || passingPercentage === undefined || timeLimit === undefined || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Missing required fields: totalMarks, passingPercentage, timeLimit, or questions array." },
        { status: 400 }
      );
    }

    const questionsWithIds: Question[] = questions.map((q) => ({
      ...q,
      id: q.id || randomUUID(),
    }));

    await fetchBackendJson(`/api/assessments/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ totalMarks, passingPercentage, timeLimit, questions: questionsWithIds }),
    });
    return NextResponse.json({ ok: true, message: `Assessment '${id}' successfully updated/created.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
