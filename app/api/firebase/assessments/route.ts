import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto"; // Use native Node.js crypto module
import { BackendApiError, fetchBackendJson } from "@/lib/backendApi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get("quizId");

    const db = getAdminDb();
    const collectionRef = db.collection("assessments");

    // Scenario A: Fetch a specific quiz
    if (quizId) {
      try {
        const assessment = await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}`);
        return NextResponse.json(assessment);
      } catch (backendError) {
        if (backendError instanceof BackendApiError && backendError.status === 404) {
          return NextResponse.json({ error: `Assessment with ID '${quizId}' not found.` }, { status: 404 });
        }
        // Any other backend failure — fall through to Firestore.
      }

      const docSnap = await collectionRef.doc(quizId).get();

      if (!docSnap.exists) {
        return NextResponse.json({ error: `Assessment with ID '${quizId}' not found.` }, { status: 404 });
      }

      return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
    }

    // Scenario B: Fetch all quizzes if no specific quizId is provided
    try {
      const { assessments } = await fetchBackendJson<{ assessments: unknown[] }>("/api/assessments");
      return NextResponse.json({ assessments });
    } catch {
      // Fall through to Firestore below.
    }

    const snapshot = await collectionRef.get();
    const assessments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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

    try {
      await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}`, {
        method: "PUT",
        body: JSON.stringify({ totalMarks, passingPercentage, timeLimit, questions: questionsWithIds }),
      });
      return NextResponse.json({ ok: true, message: `Assessment '${quizId}' successfully updated/created.` });
    } catch {
      // Fall through to Firestore below.
    }

    // Save to Firestore using the quizId as the document ID
    await getAdminDb()
      .collection("assessments")
      .doc(quizId)
      .set(
        {
          quizId,
          totalMarks,
          passingPercentage,
          timeLimit,
          questions: questionsWithIds, // Save the updated questions array with unique IDs
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true } // Merges if doc exists, creates if it doesn't
      );

    return NextResponse.json({ ok: true, message: `Assessment '${quizId}' successfully updated/created.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
