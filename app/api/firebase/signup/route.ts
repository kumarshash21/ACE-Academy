import { NextResponse } from "next/server";
import { createUserProfile } from "@/lib/create-user-profile";
import { isGreyOrangeEmail, normalizeEmail } from "@/lib/email-validation";

type SignupBody = {
  uid?: string;
  name?: string;
  email?: string;
  team?: string;
  allowedLevel?: number;
};

/**
 * POST /api/firebase/signup
 *
 * Self-signup profile creation. The Firebase Auth account is already created
 * client-side (createUserWithEmailAndPassword) before this is called — this
 * endpoint only owns writing the profile row (Postgres-primary, Firestore-fallback).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const uid = body.uid?.trim();
    const name = body.name?.trim();
    const team = body.team?.trim();
    const email = body.email ? normalizeEmail(body.email) : "";
    const allowedLevel = typeof body.allowedLevel === "number" ? body.allowedLevel : 0;

    if (!uid || !name || !email || !team) {
      return NextResponse.json(
        { error: "uid, name, email, and team are required." },
        { status: 400 }
      );
    }

    if (!isGreyOrangeEmail(email)) {
      return NextResponse.json(
        { error: "Please use a GreyOrange organization email (@greyorange.com)." },
        { status: 400 }
      );
    }

    await createUserProfile({
      uid,
      name,
      email,
      team,
      role: "learner",
      allowedLevel,
      allowedLevelSource: "team",
    });

    return NextResponse.json({ ok: true, uid }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
