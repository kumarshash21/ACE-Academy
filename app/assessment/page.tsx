"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CertId } from "@/lib/academy-data";
import { isLevelUnlocked } from "@/lib/assessment-mapping";
import type { CertificationModule } from "@/lib/certifications";
import { getSessionUid, syncSessionFromProfile } from "@/lib/session";
import { fetchUserProfile } from "@/lib/user-profile";
import AppShell from "../../components/AppShell";
import { apiUrl } from "@/lib/api";

const COURSE_TABS = [
  { id: "rtp", name: "Ranger RTP", icon: "🤖", cssClass: "rtp" },
  { id: "ttp", name: "Ranger TTP", icon: "📦", cssClass: "ttp" },
  { id: "ril", name: "Ranger RIL", icon: "🚚", cssClass: "ril" },
  { id: "tools", name: "Tools & Techniques", icon: "🛠️", cssClass: "tools" },
];

// Default schemas used for standard tracks (RTP & TTP)
const DEFAULT_LEVEL_SCHEMAS = [
  { id: "pathfinder", name: "PathFinder", subtitle: "Concept & Problem Statement", icon: "🧭", cssClass: "pathfinder" },
  { id: "navigator", name: "Navigator", subtitle: "UI Flow & System Logic", icon: "🗺️", cssClass: "navigator" },
  { id: "grandmaster", name: "GrandMaster", subtitle: "Advanced Architecture & Edge Cases", icon: "🏆", cssClass: "grandmaster" },
];

// Special single-level schema explicitly for the Tools & Techniques track
const TOOLS_LEVEL_SCHEMAS = [
  { id: "specialist", name: "Specialist", subtitle: "Core Tools & Methodology", icon: "🔧", cssClass: "tools-specialist" },
];

// Tier order backing DEFAULT_LEVEL_SCHEMAS, used to compare against a user's allowedLevel.
const LEVEL_ORDER = ["pathfinder", "navigator", "grandmaster"];

interface Question {
  id?: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface QuizData {
  id: string;
  quizId: string;
  timeLimit: number; // in seconds
  passingPercentage: number;
  questions?: Question[];
  totalMarks?: number;
}

interface QuizResult {
  score: number;
  requiredScore: number;
  isPassed: boolean;
  correctCount: number;
  totalQuestions: number;
  unlockMsg: string;
}

interface SavedProgress {
  answers: Record<string, string>;
  currentQuestionIndex: number;
  timeLeft: number;
  savedAt: number;
}

function getModuleNameForTab(tabId: string): string | undefined {
  return COURSE_TABS.find((tab) => tab.id === tabId)?.name;
}

// Same tab -> allowedLevel gating logic used to decide which level cards render,
// reused so the metadata prefetch fetches exactly the levels that will be shown.
function getLevelSchemasForTab(tabId: string, allowedLevel: number | undefined) {
  if (tabId === "tools") return TOOLS_LEVEL_SCHEMAS;
  return typeof allowedLevel === "number"
    ? DEFAULT_LEVEL_SCHEMAS.filter((level) => LEVEL_ORDER.indexOf(level.id) < allowedLevel)
    : DEFAULT_LEVEL_SCHEMAS;
}

// Stable key for a question's answer. Prefers a real id from the quiz doc,
// falling back to position so order stays consistent within a single quiz.
function getQid(question: Question, index: number): string {
  return question.id ?? `idx-${index}`;
}

function progressKey(uid: string | null, quizId: string): string {
  return `ace-assessment-progress:${uid ?? "anon"}:${quizId}`;
}

function loadProgress(uid: string | null, quizId: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(uid, quizId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    // Ignore exhausted/expired attempts — nothing useful left to resume.
    if (!parsed || typeof parsed.timeLeft !== "number" || parsed.timeLeft <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveProgress(uid: string | null, quizId: string, progress: SavedProgress) {
  try {
    localStorage.setItem(progressKey(uid, quizId), JSON.stringify(progress));
  } catch {
    /* localStorage unavailable (private mode / quota) — degrade silently */
  }
}

function clearProgress(uid: string | null, quizId: string) {
  try {
    localStorage.removeItem(progressKey(uid, quizId));
  } catch {
    /* ignore */
  }
}

export default function AssessmentsPage() {
  const [activeTabId, setActiveTabId] = useState<string>("rtp");
  const [assessmentMeta, setAssessmentMeta] = useState<Record<string, QuizData>>({});
  const [metaLoaded, setMetaLoaded] = useState<Record<string, boolean>>({});
  const [activeLoadingLevel, setActiveLoadingLevel] = useState<string | null>(null);
  const [certifications, setCertifications] = useState<CertificationModule[]>([]);
  const [allowedLevel, setAllowedLevel] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Quiz Execution States ---
  const [activeQuizData, setActiveQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // --- Resume Prompt States ---
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingQuiz, setPendingQuiz] = useState<QuizData | null>(null);
  const [pendingProgress, setPendingProgress] = useState<SavedProgress | null>(null);

  const timeLeftRef = useRef<number>(0);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // --- Custom Modal UI States ---
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showConfigAlert, setShowConfigAlert] = useState(false);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  
  // --- Score Screen State ---
  const [resultData, setResultData] = useState<QuizResult | null>(null);

  useEffect(() => {
    const uid = getSessionUid();
    if (!uid) return;

    fetchUserProfile(uid).then(({ profile }) => {
      if (profile?.certifications) {
        setCertifications(profile.certifications);
        syncSessionFromProfile(profile);
      }
      if (typeof profile?.allowedLevel === "number") {
        setAllowedLevel(profile.allowedLevel);
      }
    });
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    setAssessmentMeta({});
    setMetaLoaded({});
  };

  const startQuiz = (data: QuizData, saved: SavedProgress | null) => {
    const totalSeconds = data.timeLimit || 1800;
    const initialTime = saved ? saved.timeLeft : totalSeconds;
    setResultData(null);
    setSelectedAnswers(saved ? saved.answers : {});
    setCurrentQuestionIndex(saved ? saved.currentQuestionIndex : 0);
    timeLeftRef.current = initialTime;
    setTimeLeft(initialTime);
    setShowResumePrompt(false);
    setPendingQuiz(null);
    setPendingProgress(null);
    setActiveQuizData(data);
  };

const handleLevelClick = async (levelId: string) => {
    const targetQuizId = `${activeTabId}-${levelId}`;
    setActiveLoadingLevel(levelId);
    
    try {
      // Both standard tracks and the tools track will now cleanly use a standard GET request relatively
      const response = await fetch(apiUrl(`/api/postgres/assessments?quizId=${targetQuizId}`));

      if (response.ok) {
        const data: QuizData = await response.json();
        
        setAssessmentMeta((prev) => ({
          ...prev,
          [levelId]: data,
        }));

        if (data.questions && data.questions.length > 0) {
          const saved = loadProgress(getSessionUid(), data.quizId);
          if (saved) {
            // Offer to resume rather than silently restoring or wiping progress.
            setResultData(null);
            setPendingQuiz(data);
            setPendingProgress(saved);
            setShowResumePrompt(true);
          } else {
            startQuiz(data, null);
          }
        } else {
          setShowConfigAlert(true);
        }
      } else {
        console.error("Failed to fetch assessment on explicit action click");
        setShowConfigAlert(true);
      }
    } catch (err) {
      console.error(`Error handling click API call for ${targetQuizId}:`, err);
      setShowConfigAlert(true);
    } finally {
      setActiveLoadingLevel(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleOptionSelect = (option: string) => {
    if (!activeQuizData?.questions) return;
    const key = getQid(activeQuizData.questions[currentQuestionIndex], currentQuestionIndex);
    setSelectedAnswers((prev) => ({
      ...prev,
      [key]: option,
    }));
  };

  const handleNext = () => {
    if (!activeQuizData) return;
    if (currentQuestionIndex < activeQuizData.questions!.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const executeQuizSubmit = useCallback(async (isTimeExpired = false) => {
    if (!activeQuizData || !activeQuizData.questions || isSubmitting) return;

    const uid = getSessionUid();
    if (!uid) {
      setShowLoginAlert(true);
      return;
    }

    let correctCount = 0;
    activeQuizData.questions.forEach((q, index) => {
      if (selectedAnswers[getQid(q, index)] === q.correctAnswer) {
        correctCount++;
      }
    });

    const totalQuestions = activeQuizData.questions.length;
    const finalScorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passThreshold = activeQuizData.passingPercentage ?? 70;
    const timeLimit = activeQuizData.timeLimit || 1800;
    const attemptedTimeSeconds = Math.max(0, timeLimit - timeLeftRef.current);

    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl("/api/postgres/assessments/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          quizId: activeQuizData.quizId,
          score: finalScorePercent,
          attemptedTimeSeconds,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        passed?: boolean;
        newScore?: number;
        nextLevelUnlocked?: string | null;
        passingPercentage?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save assessment result.");
      }

      const { profile } = await fetchUserProfile(uid);
      if (profile?.certifications) {
        setCertifications(profile.certifications);
        syncSessionFromProfile(profile);
      }
      if (typeof profile?.allowedLevel === "number") {
        setAllowedLevel(profile.allowedLevel);
      }

      const isPassed = payload.passed ?? finalScorePercent >= passThreshold;
      const savedScore = payload.newScore ?? finalScorePercent;
      const requiredScore = payload.passingPercentage ?? passThreshold;
      const unlockMsg = payload.nextLevelUnlocked
        ? `Next level unlocked: ${payload.nextLevelUnlocked}`
        : "";

      setResultData({
        score: savedScore,
        requiredScore,
        isPassed,
        correctCount,
        totalQuestions,
        unlockMsg
      });

      clearProgress(uid, activeQuizData.quizId);
      setActiveQuizData(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [activeQuizData, isSubmitting, selectedAnswers]);

  useEffect(() => {
    if (!activeQuizData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowTimeoutAlert(true);
          executeQuizSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuizData, executeQuizSubmit]);

  // Auto-submit assessment when the user switches browser tabs/windows.
  useEffect(() => {
    if (!activeQuizData) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        executeQuizSubmit(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeQuizData, executeQuizSubmit]);

  // Persist in-progress state so the user can resume after a refresh/close.
  useEffect(() => {
    if (!activeQuizData) return;
    saveProgress(getSessionUid(), activeQuizData.quizId, {
      answers: selectedAnswers,
      currentQuestionIndex,
      timeLeft,
      savedAt: Date.now(),
    });
  }, [activeQuizData, selectedAnswers, currentQuestionIndex, timeLeft]);

  // Prefetch time/pass-percentage metadata for every level card of the active tab up
  // front, so the pills show real backend values instead of the 30min/75% fallback
  // defaults until the user clicks a level.
  useEffect(() => {
    let cancelled = false;
    const schemas = getLevelSchemasForTab(activeTabId, allowedLevel);

    schemas.forEach(async (level) => {
      const quizId = `${activeTabId}-${level.id}`;
      try {
        const response = await fetch(apiUrl(`/api/postgres/assessments?quizId=${quizId}`));
        if (response.ok && !cancelled) {
          const data: QuizData = await response.json();
          if (!cancelled) {
            setAssessmentMeta((prev) => ({ ...prev, [level.id]: data }));
          }
        }
      } catch {
        // Leave the fallback defaults in place if metadata can't be fetched.
      } finally {
        // Mark settled (success or failure) so the pill stops showing the
        // loading placeholder and falls back to defaults if nothing arrived.
        if (!cancelled) {
          setMetaLoaded((prev) => ({ ...prev, [level.id]: true }));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeTabId, allowedLevel]);

  const ModernSystemModal = ({ title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel", isDestructive = false }: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }) => (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)"
    }}>
      <div style={{
        backgroundColor: "#1c2128", border: "1px solid #444c56", borderRadius: "14px",
        padding: "28px", width: "100%", maxWidth: "440px", textAlign: "center",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#f0f6fc", fontWeight: "600" }}>{title}</h3>
        <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#768390", lineHeight: "1.5" }}>{message}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          {onCancel && (
            <button onClick={onCancel} style={{
              padding: "10px 20px", borderRadius: "8px", border: "1px solid #444c56",
              backgroundColor: "transparent", color: "#adbac7", cursor: "pointer", fontSize: "14px", fontWeight: "500"
            }}>{cancelText}</button>
          )}
          <button onClick={onConfirm} style={{
            padding: "10px 20px", borderRadius: "8px", border: "none",
            backgroundColor: isDestructive ? "#da3633" : "#316cf4", color: "#ffffff",
            cursor: "pointer", fontSize: "14px", fontWeight: "500"
          }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );

  if (resultData) {
    const { score, requiredScore, isPassed, correctCount, totalQuestions, unlockMsg } = resultData;
    return (
      <div style={{
        backgroundColor: "#0d1117", color: "#ffffff", minHeight: "100vh", width: "100vw",
        fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
      }}>
        <div style={{
          backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "24px",
          width: "100%", maxWidth: "620px", padding: "60px 40px", display: "flex",
          flexDirection: "column", alignItems: "center", textAlign: "center",
          boxShadow: isPassed ? "0 0 50px rgba(108, 92, 231, 0.15)" : "0 0 50px rgba(239, 68, 68, 0.1)"
        }}>
          <div style={{ fontSize: "54px", marginBottom: "24px" }}>{isPassed ? "🎉" : "📖"}</div>
          <h1 style={{ fontSize: "96px", fontWeight: "800", margin: "0 0 16px 0", color: isPassed ? "#10b981" : "#f87171", letterSpacing: "-2px" }}>{Math.round((correctCount / totalQuestions) * 100)}%</h1>
          <p style={{ fontSize: "18px", color: "#c9d1d9", maxWidth: "480px", margin: "0 0 40px 0", lineHeight: "1.6" }}>
            {isPassed ? `Congratulations! You passed the evaluation block and hit target mastery goals. ${unlockMsg}` : `You need ${requiredScore}% to pass. Review the track blueprint files and retry the application block.`}
          </p>
          <div style={{ display: "flex", gap: "12px", marginBottom: "48px", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ backgroundColor: "#21262d", border: "1px solid #30363d", padding: "8px 18px", borderRadius: "20px", fontSize: "14px", color: "#c9d1d9", fontWeight: "600" }}>{correctCount} / {totalQuestions} correct</div>
            <div style={{ backgroundColor: isPassed ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", border: isPassed ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)", padding: "8px 18px", borderRadius: "20px", fontSize: "14px", color: isPassed ? "#10b981" : "#f87171", fontWeight: "600" }}>{isPassed ? "✓ Passed" : "✗ Failed"}</div>
            <div style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245,158,11,0.2)", padding: "8px 18px", borderRadius: "20px", fontSize: "14px", color: "#f59e0b", fontWeight: "600" }}>Pass mark: {requiredScore}%</div>
          </div>
          <div style={{ display: "flex", gap: "16px", width: "100%" }}>
            <button onClick={() => setResultData(null)} style={{ flex: 1, backgroundColor: "transparent", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: "10px", padding: "16px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#21262d"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>← Back to Assessments</button>
            {isPassed && (
              <button onClick={() => { setResultData(null); window.location.href = '/ace_academy/certifications'; }} style={{ flex: 1, backgroundColor: "#6c5ce7", border: "none", color: "#ffffff", borderRadius: "10px", padding: "16px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "0.2s", boxShadow: "0 4px 20px rgba(108,92,231,0.3)" }} onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>View Certifications →</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeQuizData && activeQuizData.questions) {
    const currentQuestion = activeQuizData.questions[currentQuestionIndex];
    const currentQid = getQid(currentQuestion, currentQuestionIndex);
    const totalQuestions = activeQuizData.questions.length;
    const trackingHeaderLabel = `${activeQuizData.id.replace("-", " — ").toUpperCase()}`;
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
      <div style={{ backgroundColor: "#0d1117", color: "#ffffff", minHeight: "100vh", width: "100vw", fontFamily: "sans-serif", padding: "40px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {showExitConfirm && (
          <ModernSystemModal title="Exit Assessment?" message={`Exiting will submit the assessment with your currently marked answers (${answeredCount}/${totalQuestions} answered). Unanswered questions will be marked wrong.`} confirmText="Submit & Exit" isDestructive={true} onConfirm={() => { setShowExitConfirm(false); executeQuizSubmit(false); }} onCancel={() => setShowExitConfirm(false)} />
        )}
        {showSubmitConfirm && (
          <ModernSystemModal title="Finish Assessment?" message={answeredCount < totalQuestions ? `You have only answered ${answeredCount}/${totalQuestions} questions. Do you want to submit anyway?` : "Are you sure you want to finish and submit this assessment?"} confirmText="Submit Now" onConfirm={() => executeQuizSubmit(false)} onCancel={() => setShowSubmitConfirm(false)} />
        )}

        <div style={{ width: "100%", maxWidth: "840px" }}>
          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#8b949e", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>🧭 {trackingHeaderLabel}</div>
              <div style={{ fontSize: "16px", color: "#c9d1d9", marginTop: "4px", fontWeight: "500" }}>Question {currentQuestionIndex + 1} of {totalQuestions}</div>
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#f8e3a1", letterSpacing: "1px" }}>{formatTime(timeLeft)}</div>
            <button onClick={() => setShowExitConfirm(true)} style={{ backgroundColor: "transparent", border: "1px solid #30363d", color: "#c9d1d9", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "14px", fontWeight: "500", transition: "background 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#21262d")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>✕ Exit</button>
          </div>

          <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "40px", marginBottom: "24px" }}>
            <span style={{ fontSize: "12px", color: "#58a6ff", fontWeight: "600", textTransform: "uppercase" }}>Question {currentQuestionIndex + 1}</span>
            <h2 style={{ fontSize: "22px", fontWeight: "600", marginTop: "12px", marginBottom: "32px", color: "#f0f6fc", lineHeight: "1.4" }}>{currentQuestion.questionText}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswers[currentQid] === option;
                return (
                  <div key={option} onClick={() => handleOptionSelect(option)} style={{ border: isSelected ? "1px solid #58a6ff" : "1px solid #30363d", backgroundColor: isSelected ? "rgba(56, 139, 253, 0.1)" : "#0d1117", borderRadius: "8px", padding: "18px 24px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s" }} onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#8b949e"; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#30363d"; }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: isSelected ? "6px solid #58a6ff" : "2px solid #30363d", backgroundColor: isSelected ? "#0d1117" : "transparent", boxSizing: "border-box" }} />
                    <span style={{ fontSize: "16px", color: isSelected ? "#58a6ff" : "#c9d1d9", fontWeight: isSelected ? "500" : "400" }}>{option}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleNext} disabled={!selectedAnswers[currentQid] || isSubmitting} style={{ backgroundColor: !selectedAnswers[currentQid] || isSubmitting ? "#30363d" : "#6c5ce7", color: !selectedAnswers[currentQid] || isSubmitting ? "#8b949e" : "#ffffff", border: "none", borderRadius: "8px", padding: "14px 36px", fontSize: "16px", fontWeight: "600", cursor: !selectedAnswers[currentQid] || isSubmitting ? "not-allowed" : "pointer", transition: "opacity 0.2s" }} onMouseEnter={(e) => { if (selectedAnswers[currentQid]) e.currentTarget.style.opacity = "0.9"; }} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              {isSubmitting ? "Submitting..." : currentQuestionIndex === totalQuestions - 1 ? "Submit Assessment" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine active level schemas dynamically depending on the current selected tab.
  // Tools & Techniques is ungated by allowedLevel; RTP/TTP only show the tiers the
  // user's team/persona is allowed to cover.
  const activeLevelSchemas = getLevelSchemasForTab(activeTabId, allowedLevel);

  return (
    <AppShell currentTab="assessment">
      {showConfigAlert && <ModernSystemModal title="Empty Assessment Layout" message="No questions found for this configuration layout." onConfirm={() => setShowConfigAlert(false)} />}
      {showLoginAlert && <ModernSystemModal title="Authentication Needed" message="You must be signed in to submit an assessment." onConfirm={() => setShowLoginAlert(false)} />}
      {showTimeoutAlert && <ModernSystemModal title="Time Expired" message="Time is up! Your assessment is being automatically calculated." onConfirm={() => setShowTimeoutAlert(false)} />}
      {showResumePrompt && pendingQuiz && pendingProgress && (
        <ModernSystemModal
          title="Resume Previous Attempt?"
          message={`You have a saved attempt — ${Object.keys(pendingProgress.answers).length} answered, ${formatTime(pendingProgress.timeLeft)} remaining. Resume where you left off, or start over?`}
          confirmText="Resume"
          cancelText="Start Over"
          onConfirm={() => startQuiz(pendingQuiz, pendingProgress)}
          onCancel={() => {
            clearProgress(getSessionUid(), pendingQuiz.quizId);
            startQuiz(pendingQuiz, null);
          }}
        />
      )}

      <div className="ph">
        <h2>Assessments</h2>
        <p>Select your track and choose a level to launch your verification quiz module.</p>
      </div>

      <div className="ptabs">
        {COURSE_TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div key={tab.id} onClick={() => handleTabChange(tab.id)} className={`ptab ${tab.cssClass} ${isActive ? "on" : ""}`}>
              <span>{tab.icon}</span>
              {tab.name}
            </div>
          );
        })}
      </div>

      <div className="a-grid" style={{ marginTop: "24px" }}>
        {activeLevelSchemas.map((level) => {
          const quizDetails = assessmentMeta[level.id];
          const isCurrentlyLoading = activeLoadingLevel === level.id;
          const moduleName = getModuleNameForTab(activeTabId);
          
          // Determine unlock rules dynamically

          const isUnlocked = activeTabId === "tools" 
  ? true // Automatically unlock the single-level specialist track
  : (moduleName && certifications.length > 0 
      ? isLevelUnlocked(certifications, moduleName, level.id as CertId) 
      : level.id === "pathfinder");
          // const isUnlocked = moduleName && certifications.length > 0 
          //   ? isLevelUnlocked(certifications, moduleName, level.id as CertId) 
          //   : level.id === "pathfinder" || level.id === "specialist";
          
          const displayMinutes = quizDetails?.timeLimit ? Math.floor(quizDetails.timeLimit / 60) : 30;
          const displayPassPercent = quizDetails?.passingPercentage ?? 75;
          const isMetaLoading = !metaLoaded[level.id];

          const cardClasses = [
            "a-card",
            level.cssClass,
            !isUnlocked ? "disabled" : ""
          ].filter(Boolean).join(" ");

          return (
            <div 
              key={level.id} 
              onClick={() => isUnlocked && !isCurrentlyLoading && handleLevelClick(level.id)} 
              className={cardClasses}
            >
              <div className="a-ico">
                {isCurrentlyLoading ? "⏳" : level.icon}
              </div>

              <div className="a-title">
                {level.name} {isCurrentlyLoading && "..."}
              </div>

              <div className="a-sub">
                {level.subtitle}
              </div>

              <div className="a-pills">
                <div className={`pill time${isMetaLoading ? " loading" : ""}`}>
                  <span>⏱</span> {isMetaLoading ? "···" : `${displayMinutes} min`}
                </div>
                <div className={`pill pass${isMetaLoading ? " loading" : ""}`}>
                  {isMetaLoading ? "···" : `Pass: ${displayPassPercent}%`}
                </div>
                {!isUnlocked && (
                  <div className="pill lock">
                    🔒 Locked
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}