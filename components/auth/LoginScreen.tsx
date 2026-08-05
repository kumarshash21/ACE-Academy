"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { greyOrangeEmailErrorMessage, isGreyOrangeEmail, normalizeEmail } from "@/lib/email-validation";
import PasswordField from "@/components/auth/PasswordField";

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (!isGreyOrangeEmail(normalizedEmail)) {
      setError(greyOrangeEmailErrorMessage());
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onLogin(normalizedEmail, password);
      if (!result.ok) {
        setError(result.error ?? "Unable to sign in.");
        return;
      }
      setEmail("");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div id="loginScreen">
      <div className="login-wrap">
        <div className="login-logo">
          <div className="go-logo">
            <div className="go-logo-badge">GO</div>
            <span className="go-logo-text">GreyOrange</span>
          </div>
          <div className="login-title">ACE Academy</div>
          <div className="login-sub">
            Accelerated Capability Engine — Sign in to continue
          </div>
        </div>
        <div className="login-card">
          <div className="login-err" style={{ display: error ? "block" : "none" }}>
            {error}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="loginEmail">Email Address</label>
              <input
                id="loginEmail"
                type="email"
                placeholder="you@greyorange.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <p style={{ marginTop: "6px", fontSize: "12px", color: "var(--text2)" }}>
                GreyOrange organization email only (@greyorange.com)
              </p>
            </div>
            <PasswordField
              id="loginPwd"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
            <button className="btn-login" type="submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? "Signing in..." : "Sign In to ACE Academy →"}
            </button>
          </form>
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <Link href="/signup" style={{ color: "#a78bfa", fontSize: "12px", textDecoration: "underline" }}>
              Don&apos;t have an account? Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
