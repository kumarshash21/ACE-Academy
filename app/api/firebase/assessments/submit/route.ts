import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { VALID_QUIZ_IDS } from "@/lib/assessment-mapping";
import { applyAssessmentResult } from "@/lib/apply-assessment-result";
import type { CertificationModule } from "@/lib/certifications";
import { getAdminDb } from "@/lib/firebaseAdmin";
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

    try {
      const result = await fetchBackendJson(`/api/assessments/${encodeURIComponent(quizId)}/submit`, {
        method: "POST",
        body: JSON.stringify({ user_id: uid, score, attemptedTimeSeconds }),
      });
      return NextResponse.json(result);
    } catch {
      // Fall through to Firestore below.
    }

    const db = getAdminDb();
    const assessmentDoc = await db.collection("assessments").doc(quizId).get();

    if (!assessmentDoc.exists) {
      return NextResponse.json({ error: `Assessment '${quizId}' not found.` }, { status: 404 });
    }

    const assessmentData = assessmentDoc.data();
    const passingPercentage =
      typeof assessmentData?.passingPercentage === "number"
        ? assessmentData.passingPercentage
        : 70;

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const userData = userDoc.data();
    const certifications = (userData?.certifications ?? []) as CertificationModule[];

    if (!Array.isArray(certifications) || certifications.length === 0) {
      return NextResponse.json({ error: "User has no certification data." }, { status: 400 });
    }

    const attemptedAt = new Date().toISOString();
    const { updatedCertifications, result } = applyAssessmentResult({
      certifications,
      quizId,
      assessmentScore: score,
      passingPercentage,
      attemptedTimeSeconds,
      attemptedAt,
    });

    await userRef.set(
      {
        certifications: updatedCertifications,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      quizId,
      passingPercentage,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const status = message.includes("not found") || message.includes("locked") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
