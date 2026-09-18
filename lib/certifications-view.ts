import {
  CMETA,
  PERSONA_CERTS,
  PRODUCTS,
  type CertId,
  type ProductSummary,
} from "@/lib/academy-data";
import type { CertificationModule, LevelProgress } from "@/lib/certifications";
import type { FirestoreUserProfile } from "@/lib/user-profile";

export type CertificationRow = {
  name: string;
  subtext?: string;
  bestScore: string | number;
  attempts: number;
  status: "Not attempted" | "In progress" | "Passed"  | "Locked";
  lastAttempt: string;
};

export type CertificationGroup = {
  id: ProductSummary["id"];
  title: string;
  icon: string;
  certifications: CertificationRow[];
};

const LEVEL_NAME_TO_CERT_ID: Record<string, CertId> = {
  pathfinder: "pathfinder",
  navigator: "navigator",
  grandmaster: "grandmaster",
  "grand master": "grandmaster",
  toolsspecialist: "toolscert",
  "tools specialist": "toolscert",
};

const normalized = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function certIdFromLevelName(levelName: string): CertId | null {
  return LEVEL_NAME_TO_CERT_ID[normalized(levelName)] ?? null;
}

function formatLastAttempt(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function mapFirestoreStatus(
  status: LevelProgress["status"] | string | undefined,
  certId: CertId
): CertificationRow["status"] {
  switch (status) {
    case "completed":
      return "Passed";
    case "in_progress":
      return "In progress";
    case "locked":
      return "Locked";
    case "not_started":
    case "not_attempted":
       return "Not attempted";
    default:
      // No record yet for this level (e.g. a product added after the user's
      // profile was created). PathFinder is always the open entry tier, so
      // treat missing data as "Not attempted" rather than defaulting to Locked.
      return certId === "pathfinder" ? "Not attempted" : "Locked";
  }
}

function levelToRow(certId: CertId, level?: LevelProgress): CertificationRow {
  const meta = CMETA[certId];
  const score = typeof level?.score === "number" ? level.score : 0;
  const attempts = typeof level?.noOfAttempts === "number" ? level.noOfAttempts : 0;

  return {
    name: `${meta.icon} ${meta.name}`,
    subtext: meta.desc,
    bestScore: score > 0 ? `${score}%` : "—",
    attempts,
    status: mapFirestoreStatus(level?.status, certId),
    lastAttempt: formatLastAttempt(level?.lastAttemptDate ?? null),
  };
}

function findLevelForCert(
  module: CertificationModule | undefined,
  certId: CertId
): LevelProgress | undefined {
  if (!module?.levels?.length) return undefined;

  const targetName = normalized(CMETA[certId].name);

  return module.levels.find((level) => {
    const byName = normalized(level.level_name) === targetName;
    const byCertId = certIdFromLevelName(level.level_name) === certId;
    return byName || byCertId;
  });
}

function visibleCertIdsForProduct(team: string, product: ProductSummary): CertId[] {
  const allowed = PERSONA_CERTS[team] ?? PERSONA_CERTS.default;
  return product.certs.filter((certId) => allowed.includes(certId));
}

function moduleForProduct(
  certifications: CertificationModule[],
  product: ProductSummary
): CertificationModule | undefined {
  return certifications.find(
    (entry) => normalized(entry.module_name) === normalized(product.name)
  );
}

/**
 * Maps Firestore `user.certifications` into UI table groups (Ranger RTP, TTP, Tools).
 */
export function mapCertificationsToGroups(
  profile: FirestoreUserProfile
): CertificationGroup[] {
  const certifications = Array.isArray(profile.certifications)
    ? profile.certifications
    : [];

  return PRODUCTS.map((product) => {
    const certModule = moduleForProduct(certifications, product);
    const visibleCerts = visibleCertIdsForProduct(profile.team, product);

    return {
      id: product.id,
      title: product.name,
      icon: product.icon,
      certifications: visibleCerts.map((certId) =>
        levelToRow(certId, findLevelForCert(certModule, certId))
      ),
    };
  }).filter((group) => group.certifications.length > 0);
}
