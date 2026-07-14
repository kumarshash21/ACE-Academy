import { apiUrl } from "@/lib/api";
import { PRODUCTS, getVisibleCerts, type CertId } from "@/lib/academy-data";

export type SyllabusModule = { code: string };
export type SyllabusTopic = { modules?: SyllabusModule[] };
export type SyllabusLevel = { name: string; topics?: SyllabusTopic[] };
export type SyllabusData = { id: string; name: string; levels?: SyllabusLevel[] };

export type SyllabusByProduct = Record<string, SyllabusData | null>;

// Firestore syllabus level names ("PathFinder", "Grand Master", "Tools Specialist", ...)
// normalized the same way lib/certifications.ts does, mapped to the CertId used
// everywhere else in the app.
const CERT_LEVEL_NAME: Record<CertId, string> = {
  pathfinder: "pathfinder",
  navigator: "navigator",
  grandmaster: "grandmaster",
  toolscert: "toolsspecialist",
};

function normalizeLevelName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function countModulesByLevel(syllabus: SyllabusData | null | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const level of syllabus?.levels ?? []) {
    const key = normalizeLevelName(level.name);
    counts[key] = (level.topics ?? []).reduce((sum, topic) => sum + (topic.modules?.length ?? 0), 0);
  }
  return counts;
}

/** Fetches every product's live syllabus once, keyed by product id. */
export async function fetchSyllabusByProduct(): Promise<SyllabusByProduct> {
  const entries = await Promise.all(
    PRODUCTS.map(async (product) => {
      try {
        const response = await fetch(apiUrl(`/api/postgres/syllabus/${product.id}`));
        if (!response.ok) return [product.id, null] as const;
        const data = (await response.json()) as SyllabusData;
        return [product.id, data] as const;
      } catch {
        return [product.id, null] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

/** Live module count for one product/cert-level, sourced from Firestore syllabus content. */
export function getModuleCountForCert(
  productId: string,
  cert: CertId,
  syllabusByProduct: SyllabusByProduct,
  fallback: number
): number {
  const syllabus = syllabusByProduct[productId];
  if (syllabus === undefined || syllabus === null) return fallback;
  return countModulesByLevel(syllabus)[CERT_LEVEL_NAME[cert]] ?? 0;
}

/** Live "modules in program" total for a team, sourced from Firestore syllabus content. */
export function getModulesInProgramFromSyllabus(team: string, syllabusByProduct: SyllabusByProduct): number {
  return PRODUCTS.reduce((total, product) => {
    const visibleCerts = getVisibleCerts(team, product.certs);
    const fallbackPerCert = product.moduleCount;
    const productTotal = visibleCerts.reduce(
      (sum, cert) => sum + getModuleCountForCert(product.id, cert, syllabusByProduct, fallbackPerCert),
      0
    );
    return total + productTotal;
  }, 0);
}

export type UserProgressCsvRow = {
  name: string;
  team: string;
  modulesCovered: number;
  modulesInProgram: number;
  certificationsEarned: number;
  personalBestScore: string;
};

export function userProgressRowsToCsv(rows: UserProgressCsvRow[]): string {
  const header = ["Name", "Team", "Modules Covered", "Certifications Earned", "Personal Best Score"];
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = rows.map((row) =>
    [row.name, row.team, `${row.modulesCovered} of ${row.modulesInProgram}`, row.certificationsEarned, row.personalBestScore]
      .map(escape)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}
