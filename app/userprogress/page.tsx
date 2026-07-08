"use client";

import AppShell from "@/components/AppShell";
import { apiUrl } from "@/lib/api";
import { formatPersonalBestScore, getCertificationsEarnedCount } from "@/lib/certifications";
import {
  fetchSyllabusByProduct,
  getModulesInProgramFromSyllabus,
  userProgressRowsToCsv,
  type SyllabusByProduct,
} from "@/lib/syllabus-progress";
import React, { useEffect, useMemo, useState } from "react";

type UserRow = {
  uid: string;
  name: string;
  email: string;
  team: string;
  role: "admin" | "learner";
  certifications: unknown;
  modulesCovered: number;
};

export default function UserProgressPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [syllabusByProduct, setSyllabusByProduct] = useState<SyllabusByProduct>({});
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl("/api/firebase/users"), { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load user progress data.");
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong while loading user progress.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
    fetchSyllabusByProduct().then((data) => {
      setSyllabusByProduct(data);
      setSyllabusLoading(false);
    });

    // Module completions happen on other pages (Syllabus), so a tab left open
    // here goes stale as soon as the admin flips back to it. Re-pull on focus
    // instead of only once at mount.
    function handleFocus() {
      loadUsers();
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") loadUsers();
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const teams = ["TAC", "Change Management", "Client Director", "CEM", "CAC", "IM"];

  const handleExportCsv = () => {
    const csv = userProgressRowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `user_progress_${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => {
        if (teamFilter !== "all" && user.team !== teamFilter) return false;
        if (!query) return true;
        return [user.name, user.email, user.team].some((field) =>
          field.toLowerCase().includes(query)
        );
      })
      .map((user) => ({
        ...user,
        modulesInProgram: getModulesInProgramFromSyllabus(user.team, syllabusByProduct),
        certificationsEarned: getCertificationsEarnedCount(user.certifications),
        personalBestScore: formatPersonalBestScore(user.certifications),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search, teamFilter, syllabusByProduct]);

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "14px 18px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text3)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "16px 18px",
    fontSize: "14px",
    color: "var(--text2)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  return (
    <AppShell currentTab="userprogress">
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px 0" }}>User Progress</h2>
          <p style={{ color: "var(--text3)", margin: 0, fontSize: "14px" }}>
            Modules covered and certifications earned across every user.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search name, email, team..."
            style={{
              flex: "1 1 240px",
              minWidth: "200px",
              padding: "10px 14px",
              fontSize: "14px",
              color: "var(--text1)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              outline: "none",
            }}
          />

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              fontSize: "14px",
              color: "var(--text1)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All teams</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <button
            className="btn-add"
            onClick={handleExportCsv}
            disabled={loading || syllabusLoading || rows.length === 0}
            style={{
              backgroundColor: "var(--purple)",
              borderColor: "var(--purple)",
              color: "#fff",
              opacity: loading || syllabusLoading || rows.length === 0 ? 0.5 : 1,
              cursor: loading || syllabusLoading || rows.length === 0 ? "not-allowed" : "pointer",
              marginLeft: "auto",
            }}
          >
            ⬇ Export CSV
          </button>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Team</th>
                  <th style={thStyle}>Modules Covered</th>
                  <th style={thStyle}>Certifications Earned</th>
                  <th style={thStyle}>Personal Best Score</th>
                </tr>
              </thead>
              <tbody>
                {loading || syllabusLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text3)" }}>
                      Loading user progress...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "#f87171" }}>
                      ⚠️ {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--text3)" }}>
                      {users.length === 0 ? "No users found." : "No users match your search or filters."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.uid}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: "var(--text1)" }}>{row.name}</td>
                      <td style={tdStyle}>{row.team}</td>
                      <td style={tdStyle}>
                        {row.modulesCovered} of {row.modulesInProgram}
                      </td>
                      <td style={tdStyle}>{row.certificationsEarned}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: "var(--text1)" }}>
                        {row.personalBestScore}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
