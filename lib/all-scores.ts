import { CMETA, PRODUCTS, type CertId } from "@/lib/academy-data";
import type { CertificationModule, LevelProgress } from "@/lib/certifications";

/** One user from the /api/postgres/users (or /rankings) listing. */
export type ScoreSourceUser = {
  uid: string;
  name: string;
  team: string;
  certifications?: unknown;
};

export type ScoreResult = "Certified" | "Not passed" | "In progress";

/** A single derived row for the All Scores table (one per attempted level). */
export type ScoreRow = {
  uid: string;
  name: string;
  team: string;
  productName: string;
  productIcon: string;
  certName: string;
  certIcon: string;
  bestScore: number;
  attempts: number;
  result: ScoreResult;
  lastAttempt: string | null;
  testDuration: number;
};

const normalized = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const LEVEL_NAME_TO_CERT_ID: Record<string, CertId> = {
  pathfinder: "pathfinder",
  navigator: "navigator",
  grandmaster: "grandmaster",
  toolsspecialist: "toolscert",
};

function certIdFromLevelName(levelName: string): CertId | null {
  return LEVEL_NAME_TO_CERT_ID[normalized(levelName)] ?? null;
}

function productForModule(moduleName: string) {
  return PRODUCTS.find((p) => normalized(p.name) === normalized(moduleName));
}

function asCertificationModules(value: unknown): CertificationModule[] {
  return Array.isArray(value) ? (value as CertificationModule[]) : [];
}

/** A level counts as "attempted" once it has at least one recorded attempt. */
function isAttempted(level: LevelProgress): boolean {
  return (
    (typeof level.noOfAttempts === "number" && level.noOfAttempts > 0) ||
    level.status === "completed" ||
    level.status === "in_progress"
  );
}

function resultForLevel(level: LevelProgress): ScoreResult {
  if (level.status === "completed") return "Certified";
  return "Not passed";
}

/**
 * Flattens every user's certification progress into one row per attempted
 * level, sorted newest-attempt first. Derived purely from the data the
 * backend already stores (best score, attempt count, last-attempt date).
 */
export function deriveScoreRows(users: ScoreSourceUser[]): ScoreRow[] {
  const rows: ScoreRow[] = [];

  for (const user of users) {
    for (const mod of asCertificationModules(user.certifications)) {
      const product = productForModule(mod.module_name);
      if (!product || !Array.isArray(mod.levels)) continue;

      for (const level of mod.levels) {
        if (!isAttempted(level)) continue;

        const certId = certIdFromLevelName(level.level_name);
        const meta = certId ? CMETA[certId] : null;

        rows.push({
          uid: user.uid,
          name: user.name || "(unnamed)",
          team: user.team || "—",
          productName: product.name,
          productIcon: product.icon,
          certName: meta?.name ?? level.level_name,
          certIcon: meta?.icon ?? "",
          bestScore: typeof level.score === "number" ? level.score : 0,
          attempts: typeof level.noOfAttempts === "number" ? level.noOfAttempts : 0,
          result: resultForLevel(level),
          lastAttempt: level.lastAttemptDate ?? level.completedAt ?? null,
          testDuration: typeof level.attemptedTime === "number" ? level.attemptedTime : 0,
        });
      }
    }
  }

  return rows.sort((a, b) => {
    const aTime = a.lastAttempt ? new Date(a.lastAttempt).getTime() : 0;
    const bTime = b.lastAttempt ? new Date(b.lastAttempt).getTime() : 0;
    return bTime - aTime;
  });
}

export function formatScoreDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

/** Formats a duration in seconds as e.g. "12m 34s" or "45s". */
export function formatTestDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

/** Builds a CSV string (with header) from derived score rows. */
export function scoreRowsToCsv(rows: ScoreRow[]): string {
  const header = ["Name", "Team", "Product", "Certification", "Score%", "Attempts", "Result", "Test Duration", "Last Attempt"];
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = rows.map((row) =>
    [
      row.name,
      row.team,
      row.productName,
      row.certName,
      row.bestScore,
      row.attempts,
      row.result,
      formatTestDuration(row.testDuration),
      formatScoreDate(row.lastAttempt),
    ]
      .map(escape)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
