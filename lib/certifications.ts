/**
 * Certification structure and utilities
 */

export type LevelProgress = {
  level_name: string;
  status: "not_started" | "not_attempted" | "in_progress" | "completed" | "locked";
  score: number;
  attemptedTime: number;
  noOfAttempts: number;
  lastAttemptDate: string | null;
  completedAt: string | null;
};

export type CertificationModule = {
  module_name: string;
  levels: LevelProgress[];
};

// Per-module level structure. Ranger RTP/TTP/RIL follow the gated three-tier path;
// Tools & Techniques is a single standalone "Tools Specialist" certification.
const MODULE_LEVELS: { module_name: string; levels: string[] }[] = [
  { module_name: "Ranger RTP", levels: ["PathFinder", "Navigator", "Grand Master"] },
  { module_name: "Ranger TTP", levels: ["PathFinder", "Navigator", "Grand Master"] },
  { module_name: "Ranger RIL", levels: ["PathFinder", "Navigator", "Grand Master"] },
  { module_name: "Tools & Techniques", levels: ["Tools Specialist"] },
];

const normalizedLevelName = (value: unknown) =>
  String(value || "").trim().toLowerCase().replace(/\s+/g, "");

const normalizedModuleName = (value: unknown) => normalizedLevelName(value);

function initialStatusForLevel(levelName: string): LevelProgress["status"] {
  const name = normalizedLevelName(levelName);
  // Standalone Tools Specialist cert starts open and unattempted.
  if (name === "toolsspecialist") return "not_attempted";
  // First tier of a gated path is open; later tiers stay locked until unlocked.
  if (name === "pathfinder") return "not_started";
  return "locked";
}

export function createInitialCertifications(_allowedLevel: number): CertificationModule[] {
  return MODULE_LEVELS.map(({ module_name, levels }) => ({
    module_name,
    levels: levels.map((levelName) => ({
      level_name: levelName,
      status: initialStatusForLevel(levelName),
      score: 0,
      attemptedTime: 0,
      noOfAttempts: 0,
      lastAttemptDate: null,
      completedAt: null,
    })),
  }));
}

export function getCurrentLevelFromCerts(certifications: unknown[]): number {
  if (!Array.isArray(certifications)) {
    return 0;
  }

  const levelOrder = ["pathfinder", "navigator", "grandmaster"];

  const modules = certifications.filter(
    (cert) => cert && typeof cert === "object" && "module_name" in cert && Array.isArray((cert as any).levels)
  ) as CertificationModule[];

  if (modules.length > 0) {
    let maxLevel = 0;
    levelOrder.forEach((levelName, index) => {
      // Only consider modules that actually contain this tier — Tools & Techniques
      // has a single standalone level and must not block tiered progression.
      const modulesWithLevel = modules.filter(
        (mod) =>
          Array.isArray(mod.levels) &&
          mod.levels.some((level) => normalizedLevelName(level.level_name) === levelName)
      );
      const allCompleted =
        modulesWithLevel.length > 0 &&
        modulesWithLevel.every((mod) =>
          mod.levels.some(
            (level) =>
              normalizedLevelName(level.level_name) === levelName &&
              level.status === "completed"
          )
        );
      if (allCompleted) {
        maxLevel = Math.max(maxLevel, index + 1);
      }
    });
    return maxLevel;
  }

  const oldLevels = certifications
    .map((cert) => {
      if (typeof cert === "string") return cert;
      if (cert && typeof cert === "object" && "level_name" in cert) {
        return (cert as any).level_name;
      }
      return null;
    })
    .filter((cert): cert is string => typeof cert === "string")
    .map((cert) => normalizedLevelName(cert));

  const foundLevels = oldLevels
    .map((cert) => levelOrder.indexOf(cert))
    .filter((index) => index >= 0);

  return foundLevels.length ? Math.max(...foundLevels) + 1 : 0;
}

export function updateModuleProgress(
  certifications: CertificationModule[],
  moduleName: string,
  levelName: string,
  updates: Partial<LevelProgress>
): CertificationModule[] {
  return certifications.map((cert) => {
    if (normalizedModuleName(cert.module_name) !== normalizedModuleName(moduleName)) return cert;

    return {
      ...cert,
      levels: cert.levels.map((level) =>
        normalizedLevelName(level.level_name) === normalizedLevelName(levelName)
          ? { ...level, ...updates }
          : level
      ),
    };
  });
}

export function updateCertificationLevelStatus(
  certifications: CertificationModule[],
  moduleName: string,
  levelName: string,
  status: LevelProgress["status"],
  completedAt?: string | null
): CertificationModule[] {
  return updateModuleProgress(certifications, moduleName, levelName, {
    status,
    ...(completedAt !== undefined ? { completedAt } : {}),
  });
}

function asCertificationModules(certifications: unknown): CertificationModule[] {
  if (!Array.isArray(certifications)) return [];

  return certifications.filter(
    (entry): entry is CertificationModule =>
      Boolean(entry) &&
      typeof entry === "object" &&
      "module_name" in entry &&
      Array.isArray((entry as CertificationModule).levels)
  );
}

/** Count of certification levels with status `completed` across all modules. */
export function getCertificationsEarnedCount(certifications: unknown): number {
  return asCertificationModules(certifications).reduce((count, mod) => {
    const completedInModule = mod.levels.filter((level) => level.status === "completed").length;
    return count + completedInModule;
  }, 0);
}

/** Highest score across all certification levels (null if none attempted). */
export function getPersonalBestScore(certifications: unknown): number | null {
  let best = 0;

  asCertificationModules(certifications).forEach((mod) => {
    mod.levels.forEach((level) => {
      if (typeof level.score === "number" && level.score > best) {
        best = level.score;
      }
    });
  });

  return best > 0 ? best : null;
}

export function formatPersonalBestScore(certifications: unknown): string {
  const best = getPersonalBestScore(certifications);
  return best !== null ? `${best}%` : "—";
}