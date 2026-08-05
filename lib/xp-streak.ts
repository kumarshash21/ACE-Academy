import type { DoneRecord } from "@/lib/progress";

const DONE_STORAGE_KEY = "ace2_done";
export const DONE_UPDATED_EVENT = "ace-done-updated";

// XP awarded per completed module, keyed by the normalized cert-level name
// baked into every "ace2_done" key (e.g. "rtp-1.1.1-pathfinder").
export const XP_PER_LEVEL: Record<string, number> = {
  pathfinder: 2,
  navigator: 3,
  grandmaster: 5,
  toolsspecialist: 2,
};

// "ace2_done" keys are "{productId}-{moduleCode}-{levelName}"; productId and
// levelName never contain hyphens, so the last segment is always the level.
function levelFromDoneKey(key: string): string {
  return key.slice(key.lastIndexOf("-") + 1);
}

export function computeXpFromDone(done: DoneRecord | null | undefined): number {
  if (!done) return 0;
  return Object.keys(done).reduce((sum, key) => sum + (XP_PER_LEVEL[levelFromDoneKey(key)] ?? 0), 0);
}

export function computeStreakFromDone(done: DoneRecord | null | undefined): number {
  if (!done) return 0;
  const dates = new Set(Object.values(done).map((iso) => iso.slice(0, 10)));
  if (dates.size === 0) return 0;

  const cursor = new Date();
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!dates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Reads this user's slice of the shared "ace2_done" localStorage blob. */
export function readLocalDoneForUser(uid: string): DoneRecord {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(window.localStorage.getItem(DONE_STORAGE_KEY) || "{}");
    return (all && typeof all === "object" && all[uid]) || {};
  } catch {
    return {};
  }
}

/** Overwrites this user's slice, e.g. with the authoritative server snapshot. */
export function writeLocalDoneForUser(uid: string, done: DoneRecord): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(window.localStorage.getItem(DONE_STORAGE_KEY) || "{}");
    all[uid] = done;
    window.localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore malformed existing state; next server sync will repair it.
  }
}

/** Same-tab signal for "ace2_done changed" — the native "storage" event only
 * fires in *other* tabs/frames, so callers that mutate ace2_done locally
 * (e.g. the syllabus page) must fire this for same-tab listeners like the
 * sidebar to notice. */
export function notifyDoneUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DONE_UPDATED_EVENT));
}

/** Subscribes to both cross-tab ("storage") and same-tab (custom event)
 * ace2_done changes. Returns an unsubscribe function. */
export function subscribeDoneUpdated(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === DONE_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DONE_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DONE_UPDATED_EVENT, callback);
  };
}
