"use client";

import AppShell from '@/components/AppShell';
import { apiUrl } from '@/lib/api';
import React, { useEffect, useMemo, useState } from "react";
import {
  deriveScoreRows,
  formatScoreDate,
  formatTestDuration,
  scoreRowsToCsv,
  type ScoreRow,
  type ScoreSourceUser,
} from "@/lib/all-scores";

export default function AllScores() {
  const [users, setUsers] = useState<ScoreSourceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl("/api/postgres/users"));
        if (!response.ok) throw new Error("Failed to load score data.");
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong while loading scores.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const allRows: ScoreRow[] = useMemo(() => deriveScoreRows(users), [users]);

  const teams = ['TAC', 'Change Management', 'Client Director', 'CEM', 'CAC', 'IM', 'Project Manager', 'Solution Integration'];

  const rows: ScoreRow[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      if (teamFilter !== "all" && row.team !== teamFilter) return false;
      if (!query) return true;
      return [row.name, row.team, row.productName, row.certName]
        .some((field) => field.toLowerCase().includes(query));
    });

    return [...filtered].sort((a, b) => {
      const aTime = a.lastAttempt ? new Date(a.lastAttempt).getTime() : 0;
      const bTime = b.lastAttempt ? new Date(b.lastAttempt).getTime() : 0;
      return sortOrder === "latest" ? bTime - aTime : aTime - bTime;
    });
  }, [allRows, search, teamFilter, sortOrder]);

  const handleExportCsv = () => {
    const csv = scoreRowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ace_scores_${new Date().toISOString().split("T")[0]}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
    <AppShell currentTab="scores">
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px 0" }}>All Scores</h2>
          <p style={{ color: "var(--text3)", margin: 0, fontSize: "14px" }}>
            Complete assessment results across the team. Export to CSV for Google Sheets import.
          </p>
        </div>

        {/* Controls */}
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
            placeholder="🔍 Search name, team, product..."
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

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "latest" | "oldest")}
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
            <option value="latest">Last attempt: Latest first</option>
            <option value="oldest">Last attempt: Oldest first</option>
          </select>

          <button
            className="btn-add"
            onClick={handleExportCsv}
            disabled={loading || rows.length === 0}
            style={{
              backgroundColor: "var(--purple)",
              borderColor: "var(--purple)",
              color: "#fff",
              opacity: loading || rows.length === 0 ? 0.5 : 1,
              cursor: loading || rows.length === 0 ? "not-allowed" : "pointer",
              marginLeft: "auto",
            }}
          >
            ⬇ Export CSV
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Team</th>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Certification</th>
                  <th style={thStyle}>Best Score</th>
                  <th style={thStyle}>Attempts</th>
                  <th style={thStyle}>Result</th>
                  <th style={thStyle}>Test Duration</th>
                  <th style={thStyle}>Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--text3)" }}>
                      Loading assessment results...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "#f87171" }}>
                      ⚠️ {error}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--text3)" }}>
                      {allRows.length === 0
                        ? "No assessment data yet."
                        : "No results match your search or filters."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const passed = row.result === "Certified";
                    return (
                      <tr key={`${row.uid}-${row.productName}-${row.certName}-${idx}`}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "var(--text1)" }}>{row.name}</td>
                        <td style={tdStyle}>{row.team}</td>
                        <td style={tdStyle}>{row.productIcon} {row.productName}</td>
                        <td style={tdStyle}>{row.certIcon} {row.certName}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: passed ? "#4ade80" : "#f87171" }}>
                          {row.bestScore}%
                        </td>
                        <td style={tdStyle}>{row.attempts}</td>
                        <td style={tdStyle}>
                          {passed ? (
                            <span style={{ color: "#4ade80", fontWeight: 600 }}>✓ Certified</span>
                          ) : (
                            <span style={{ color: "#f87171", fontWeight: 600 }}>Not passed</span>
                          )}
                        </td>
                        <td style={tdStyle}>{formatTestDuration(row.testDuration)}</td>
                        <td style={{ ...tdStyle, color: "var(--text3)", fontSize: "12px" }}>
                          {formatScoreDate(row.lastAttempt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
