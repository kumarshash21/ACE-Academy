"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { greyOrangeEmailErrorMessage, isGreyOrangeEmail, normalizeEmail } from "@/lib/email-validation";
import PasswordField from "@/components/auth/PasswordField";
import { apiUrl } from "@/lib/api";
const TEAM_OPTIONS = ['TAC','Change Management','Client Director','CEM','CAC','IM','Management','Product Manager','SIM'];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [team, setTeam] = useState(TEAM_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isGreyOrangeEmail(normalizedEmail)) {
      setError(greyOrangeEmailErrorMessage());
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(credential.user, {
        displayName: name.trim(),
      });

      const teamPolicyResponse = await fetch(apiUrl(`/api/postgres/team-policy?team=${encodeURIComponent(team)}`));
      const teamPolicy = teamPolicyResponse.ok
        ? await teamPolicyResponse.json()
        : { allowedLevel: 0 };

      const response = await fetch(apiUrl("/api/postgres/signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: credential.user.uid,
          name: name.trim(),
          email: normalizedEmail,
          team,
          allowedLevel: typeof teamPolicy.allowedLevel === "number" ? teamPolicy.allowedLevel : 0,
        }),
      });

      if (!response.ok) {
        let serverError = "Failed to store account metadata.";

        try {
          const responseBody = (await response.json()) as { error?: string };
          if (responseBody?.error) {
            serverError = responseBody.error;
          }
        } catch {
          // Ignore JSON parse failures and fall back to the default message.
        }

        throw new Error(serverError);
      }

      setSuccess("Account created successfully in Firebase. You can now sign in.");
      setName("");
      setEmail("");
      setPassword("");
      setTeam(TEAM_OPTIONS[0]);
      setRegistered(true);

      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create account. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      id="loginScreen"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "#0b0e14", // Added matching dark background matching design
      }}
    >
      <div 
        className="login-wrap" 
        style={{ 
          width: "100%", 
          maxWidth: "1100px", // Expanded to allow side-by-side positioning
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "64px",
          flexWrap: "wrap"
        }}
      >
        {/* Left Section: Text & Branding */}
        <div className="login-logo" style={{ textAlign: "center", flex: "1 1 400px", maxWidth: "500px" }}>
          <div className="go-logo" style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <div className="go-logo-badge" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#FF6B00", color: "#fff", height: "46px", width: "46px", borderRadius: "10px", fontWeight: 800, fontSize: "18px" }}>
              GO
            </div>
            <span className="go-logo-text" style={{ color: "#e8edf5", fontSize: "22px", fontWeight: 700 }}>
              GreyOrange
            </span>
          </div>
          <div className="login-title" style={{ fontSize: "42px", fontWeight: 800, marginBottom: "16px", color: "#ffffff", lineHeight: "1.2" }}>
            Create your <span 
            style={{ background: "linear-gradient(to right, #b493ff, #fbcfe8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ACE Academy</span> account
          </div>
        </div>

        {/* Right Section: Form Card */}
        <div className="login-card" style={{ background: "#161b27", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", padding: "40px", flex: "1 1 420px", maxWidth: "460px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
          {registered ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "72px",
                  width: "72px",
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.12)",
                  border: "2px solid rgba(16,185,129,0.4)",
                  marginBottom: "24px",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff", marginBottom: "10px" }}>
                Sign In done
              </div>
              <p style={{ fontSize: "14px", color: "#a7f3d0", marginBottom: "8px" }}>
                Your account has been registered successfully.
              </p>
              <p style={{ fontSize: "13px", color: "#8a95a8", display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <span
                  style={{
                    display: "inline-block",
                    height: "14px",
                    width: "14px",
                    border: "2px solid rgba(167,139,250,0.4)",
                    borderTopColor: "#a78bfa",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Redirecting to login page...
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
          <>
          {error ? (
            <div className="login-err" style={{ display: "block", marginBottom: "16px" }}>{error}</div>
          ) : null}
          {success ? (
            <div
              className="login-err"
              style={{
                display: "block",
                marginBottom: "16px",
                background: "rgba(16,185,129,0.12)",
                borderColor: "rgba(16,185,129,0.28)",
                color: "#a7f3d0",
              }}
            >
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="signupName">Full Name</label>
              <input
                id="signupName"
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="signupEmail">Email Address</label>
              <input
                id="signupEmail"
                type="email"
                placeholder="you@greyorange.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
              {/* <p style={{ marginTop: "6px", fontSize: "12px", color: "#8a95a8" }}>
                GreyOrange organization email only (@greyorange.com)
              </p> */}
            </div>

            <PasswordField
              id="signupPassword"
              label="Password"
              placeholder="Create a password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={6}
              required
            />

            <div className="field">
              <label htmlFor="signupTeam">Team</label>
              <select
                id="signupTeam"
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                style={{
                  width: "100%",
                  background: "#1e2536",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  color: "#e8edf5",
                  padding: "11px 14px",
                  fontSize: "14px",
                }}
              >
                {TEAM_OPTIONS.map((teamOption) => (
                  <option value={teamOption} key={teamOption}>
                    {teamOption}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-login" type="submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div style={{ marginTop: "14px", textAlign: "center" }}>
            <Link href="/" style={{ color: "#a78bfa", fontSize: "12px", textDecoration: "underline" }}>
              Back to sign in
            </Link>
          </div>
          </>
          )}
        </div>
      </div>
    </main>
  );
}
