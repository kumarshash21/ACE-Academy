import { FAQ_KNOWLEDGE_BASE, type FaqEntry } from "./knowledge-base";

export const FALLBACK_ANSWER =
  "I can't answer that just yet — I only know the topics listed above right now. For anything else, email kumar.s.int@greyorange.com or ask in #help-ace-academy on Slack.";

const MIN_MATCH_SCORE = 1;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreEntry(normalizedInput: string, entry: FaqEntry): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    if (normalizedInput.includes(normalize(keyword))) {
      score += keyword.split(" ").length;
    }
  }
  return score;
}

export interface BotReply {
  answer: string;
  matchedId: string | null;
}

/**
 * Resolves a user message to a hardcoded FAQ answer.
 *
 * This is the single seam meant for future growth: swap the body of this
 * function for a fetch() to a real backend/LLM endpoint later without
 * touching the UI or the knowledge base shape.
 */
export function getBotReply(userMessage: string): BotReply {
  const normalizedInput = normalize(userMessage);
  if (!normalizedInput) {
    return { answer: FALLBACK_ANSWER, matchedId: null };
  }

  let bestEntry: FaqEntry | null = null;
  let bestScore = 0;

  for (const entry of FAQ_KNOWLEDGE_BASE) {
    const score = scoreEntry(normalizedInput, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry && bestScore >= MIN_MATCH_SCORE) {
    return { answer: bestEntry.answer, matchedId: bestEntry.id };
  }

  return { answer: FALLBACK_ANSWER, matchedId: null };
}
