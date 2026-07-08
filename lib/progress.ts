export type ScoreRecord = {
  uid: string;
  pid: string;
  cid: string;
  score: number;
  passed: boolean;
};

export type DoneRecord = Record<string, string>;

export type ProgressSnapshot = {
  scores: ScoreRecord[];
  done: DoneRecord;
};

/** Single source of truth for "modules covered" — the Dashboard's stat and the
 * admin User Progress listing must both call this so the two can never drift. */
export function countModulesCovered(done: unknown): number {
  return done && typeof done === "object" ? Object.keys(done).length : 0;
}
