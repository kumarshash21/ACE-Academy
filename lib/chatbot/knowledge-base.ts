// Hardcoded FAQ knowledge base for AceBot.
//
// This is the seed data source for the assistant. Each entry is matched
// against a user's message by `lib/chatbot/engine.ts`. To add a new answer,
// append an entry below — no other code needs to change. When a real
// backend/LLM integration is ready, `engine.ts` is the only file that needs
// to change; this shape (and the UI) can stay the same.
export interface FaqEntry {
  id: string;
  /** Canonical question, shown as a suggestion chip in the UI. */
  question: string;
  /** Words/phrases that should trigger this answer. Lowercase, no punctuation. */
  keywords: string[];
  answer: string;
}

export const FAQ_KNOWLEDGE_BASE: FaqEntry[] = [
  {
    id: "about-ace",
    question: "What is ACE Academy?",
    keywords: ["what is ace academy", "about ace academy", "ace academy", "accelerated capability engine"],
    answer:
      "ACE Academy (Accelerated Capability Engine) is GreyOrange's learning and certification platform. It brings together syllabus content, timed assessments, certifications, and progress tracking in one place.",
  },
  {
    id: "take-assessment",
    question: "How do I take an assessment?",
    keywords: ["take an assessment", "start assessment", "start a test", "attempt assessment", "how to take", "give test", "give exam"],
    answer:
      "Go to the Assessments tab from the sidebar, pick a track (Pathfinder, Navigator, Grandmaster, or Tools Specialist), then choose a level card to start. Each assessment shows its time limit and pass mark before you begin.",
  },
  {
    id: "assessment-scoring",
    question: "How is my assessment scored?",
    keywords: ["scoring", "how is it scored", "passing percentage", "pass mark", "how to pass", "grading"],
    answer:
      "Your score is the percentage of questions you answered correctly. The pass mark varies by assessment and is shown on the assessment card and result screen — you'll see it before and after you attempt it.",
  },
  {
    id: "assessment-time",
    question: "How much time do I get for an assessment?",
    keywords: ["time limit", "how long", "duration", "minutes", "timer"],
    answer:
      "Each assessment has its own time limit, shown on the assessment card (for example, \"30 min\"). A countdown timer runs while you attempt it, and it turns red when time is almost up.",
  },
  {
    id: "retake-assessment",
    question: "Can I retake a failed assessment?",
    keywords: ["retake", "retry", "failed assessment", "try again", "re-attempt", "reattempt"],
    answer:
      "Yes. If you don't reach the pass mark, you'll see a \"Review and retry\" option on the result screen so you can revisit the syllabus and attempt again.",
  },
  {
    id: "certification-levels",
    question: "What are the certification levels?",
    keywords: ["certification levels", "pathfinder", "navigator", "grandmaster", "tools specialist", "levels", "tracks"],
    answer:
      "ACE Academy certifications progress through levels such as Pathfinder, Navigator, and Grandmaster, plus a Tools Specialist certification. You unlock later levels as you pass earlier ones — check your Journey on the Dashboard.",
  },
  {
    id: "view-certifications",
    question: "Where can I see my certifications?",
    keywords: ["my certifications", "view certifications", "earned certificates", "certificate"],
    answer:
      "Open the \"My Certifications\" tab in the sidebar to see every certification you've earned, grouped by product.",
  },
  {
    id: "xp-points",
    question: "How do I earn XP?",
    keywords: ["xp", "experience points", "earn points", "how to earn xp"],
    answer:
      "You earn XP by completing syllabus modules and passing assessments. Your total XP is shown at the bottom of the sidebar.",
  },
  {
    id: "day-streak",
    question: "What is the day streak?",
    keywords: ["streak", "day streak", "daily streak"],
    answer:
      "Your day streak counts consecutive days you've made progress (like completing a module) in ACE Academy. It's shown next to the flame icon in the sidebar.",
  },
  {
    id: "mark-module-done",
    question: "How do I mark a syllabus module as done?",
    keywords: ["mark as done", "mark module", "complete module", "syllabus progress", "track progress"],
    answer:
      "In the Syllabus tab, open a module and click \"Mark as Done\" once you've gone through its content and linked resources.",
  },
  {
    id: "functional-training",
    question: "What is Functional Training?",
    keywords: ["functional training"],
    answer:
      "Functional Training is a separate learning track focused on role-specific skills. You can find it in the sidebar under \"Functional Training\".",
  },
  {
    id: "view-scores",
    question: "Where can I view my past scores?",
    keywords: ["my scores", "past scores", "result history", "score history", "all scores"],
    answer:
      "Your own results appear on the assessment result screen after each attempt. Admins can see everyone's scores under the \"All Scores\" tab.",
  },
  {
    id: "sign-out",
    question: "How do I sign out?",
    keywords: ["sign out", "log out", "logout"],
    answer:
      "Click \"Sign out\" in the top-right corner of the screen to end your session.",
  },
  {
    id: "login-issue",
    question: "I'm having trouble logging in.",
    keywords: ["forgot password", "cant login", "can't login", "login issue", "login problem", "reset password"],
    answer:
      "If you're stuck signing in, reach out to the ACE Academy team at kumar.s.int@greyorange.com or the #help-ace-academy Slack channel and they'll help you get back in.",
  },
  {
    id: "contact-support",
    question: "How do I contact support?",
    keywords: ["contact support", "get help", "support", "help channel", "talk to someone", "reach team"],
    answer:
      "You can email kumar.s.int@greyorange.com or join the #help-ace-academy channel on Slack — both are listed on the About page too.",
  },
];
