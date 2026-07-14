"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getUsersFromStorage, type User } from "@/lib/auth";
import { greyOrangeEmailErrorMessage, isGreyOrangeEmail, normalizeEmail } from "@/lib/email-validation";
import { getCurrentLevelFromCerts } from "@/lib/certifications";
import { apiUrl } from "@/lib/api";

type LoginResult = {
  ok: boolean;
  error?: string;
};

type FirestoreUserProfile = {
  uid?: string;
  name?: string;
  email?: string;
  team?: string;
  role?: "admin" | "learner";
  level?: number;
  allowedLevel?: number;
  allowedLevelSource?: string;
  certifications?: Array<{
    module_name?: string;
    levels?: Array<{
      level_name?: string;
      status?: string;
      score?: number;
      attemptedTime?: number;
      noOfAttempts?: number;
      lastAttemptDate?: string | null;
      completedAt?: string | null;
    }>;
  }> | Array<{
    level_name?: string;
    status?: string;
    completedAt?: string | null;
    modules?: Array<{
      name?: string;
      status?: string;
      score?: number;
      noOfAttempts?: number;
      lastAttemptDate?: string | null;
    }>;
  }> | string[];
};

function toUserFromFirebase(
  email: string,
  firebaseUser: { uid: string; displayName?: string | null; email?: string | null },
  profile?: FirestoreUserProfile
): User {
  const displayName = profile?.name?.trim() || firebaseUser.displayName?.trim() || firebaseUser.email?.split("@")[0] || "Learner";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LN";

  let certifications: any[] = [];
  let computedLevel = 0;

  if (Array.isArray(profile?.certifications)) {
    certifications = profile.certifications;
    computedLevel = getCurrentLevelFromCerts(profile.certifications as any[]);
  }

  return {
    id: firebaseUser.uid,
    name: displayName,
    email: profile?.email ?? firebaseUser.email ?? email,
    password: "",
    role: profile?.role ?? "learner",
    team: profile?.team ?? "TAC",
    av: initials,
    level: computedLevel || (typeof profile?.level === "number" ? profile.level : 0),
    allowedLevel: typeof profile?.allowedLevel === "number" ? profile.allowedLevel : 0,
    allowedLevelSource: profile?.allowedLevelSource,
    certifications,
  };
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Seed users to localStorage on first load to preserve legacy behavior.
    getUsersFromStorage();
    setIsReady(true);
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);

    if (!isGreyOrangeEmail(normalizedEmail)) {
      return { ok: false, error: greyOrangeEmailErrorMessage() };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      let profile: FirestoreUserProfile | undefined;

      try {
        const profileResponse = await fetch(apiUrl(`/api/postgres/user/${credential.user.uid}`));
        if (profileResponse.ok) {
          profile = (await profileResponse.json()) as FirestoreUserProfile;
        }
      } catch (_profileError) {
        // Ignore profile fetch failures and fall back to defaults.
      }

      const user = toUserFromFirebase(normalizedEmail, credential.user, profile);

      if (profile) {
        console.log("Login hydrated from Firestore profile:", {
          uid: user.id,
          name: user.name,
          email: user.email,
          team: user.team,
          role: user.role,
          level: user.level,
          allowedLevel: user.allowedLevel,
          allowedLevelSource: user.allowedLevelSource,
          certifications: user.certifications,
        });
      } else {
        console.log("Login fell back to Firebase/default values (Firestore profile not found):", {
          uid: user.id,
          name: user.name,
          email: user.email,
          team: user.team,
          role: user.role,
          level: user.level,
          allowedLevel: user.allowedLevel,
          certifications: user.certifications,
        });
      }

      setCurrentUser(user);
      return { ok: true };
    } catch (firebaseError) {
      const users = getUsersFromStorage();
      const fallbackUser = users.find(
        (candidate) =>
          candidate.email.toLowerCase() === normalizedEmail &&
          candidate.password === password
      );

      if (!fallbackUser) {
        console.log("Login failed. No Firestore profile and no local fallback user found.");
        return { ok: false, error: "Incorrect email or password. Please try again." };
      }

      console.log("Login using local fallback user data:", fallbackUser);
      setCurrentUser(fallbackUser);
      return { ok: true };
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (_error) {
      // Ignore Firebase sign-out failures and preserve local session cleanup.
    }

    setCurrentUser(null);
  }

  return {
    currentUser,
    isReady,
    login,
    logout,
  };
}
