"use client";

import { useState, useEffect } from "react";
import AppShell from "../../components/AppShell";
import { getSessionUid, getSessionTeam } from "@/lib/session";
import { fetchUserProfile } from "@/lib/user-profile";
import { apiUrl } from "@/lib/api";
import salesforceIcon from "../../public/assets/img/salesforceicon.png";

type ModuleItem = {
  id: number | string;
  title: string;
  link: string;
  sort_order?: number;
};

type TopicNode = {
  id: number | string;
  team: string;
  title: string;
  sort_order?: number;
  modules: ModuleItem[];
};

const XP_PER_MODULE = 10;

const LEVELS = [
  { name: "Rookie", min: 0, color: "var(--text2)" },
  { name: "Learner", min: 50, color: "var(--cyan-l)" },
  { name: "Specialist", min: 150, color: "var(--purple-l)" },
  { name: "Expert", min: 300, color: "var(--amber-l)" },
];

function getLevel(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.min) current = lvl;
  }
  return current;
}

// function computeStreak(log: Record<string, string>): number {
//   const dates = new Set(Object.values(log).map((iso) => iso.slice(0, 10)));
//   if (dates.size === 0) return 0;

//   const cursor = new Date();
//   const todayStr = cursor.toISOString().slice(0, 10);
//   if (!dates.has(todayStr)) {
//     cursor.setDate(cursor.getDate() - 1);
//   }

//   let streak = 0;
//   while (dates.has(cursor.toISOString().slice(0, 10))) {
//     streak++;
//     cursor.setDate(cursor.getDate() - 1);
//   }
//   return streak;
// }

export default function FunctionalTraining() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [completionLog, setCompletionLog] = useState<Record<string, string>>({});
  const [celebration, setCelebration] = useState<string | null>(null);

  const [userTeam, setUserTeam] = useState<string | null>(() => getSessionTeam());
  const [isLoadingTeam, setIsLoadingTeam] = useState(() => getSessionTeam() === null);

  useEffect(() => {
    const savedCompletions = localStorage.getItem("ace_completed_trainings");
    if (savedCompletions) {
      try {
        setCompletedItems(JSON.parse(savedCompletions));
      } catch (e) {
        console.error("Error parsing completion data from localStorage", e);
      }
    }

    const savedLog = localStorage.getItem("ace_completion_log");
    if (savedLog) {
      try {
        setCompletionLog(JSON.parse(savedLog));
      } catch (e) {
        console.error("Error parsing completion log from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    const uid = getSessionUid();
    if (!uid) {
      setIsLoadingTeam(false);
      return;
    }

    fetchUserProfile(uid).then(({ profile }) => {
      setUserTeam(profile?.team ?? null);
      setIsLoadingTeam(false);
    });
  }, []);

  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(true);
  const [trainingsError, setTrainingsError] = useState(false);

  useEffect(() => {
    if (isLoadingTeam) return;

    if (!userTeam) {
      setTopics([]);
      setIsLoadingTrainings(false);
      return;
    }

    setIsLoadingTrainings(true);
    fetch(apiUrl(`/api/postgres/functional-training-topics/tree?team=${encodeURIComponent(userTeam)}`))
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load functional training.");
        return res.json();
      })
      .then((body: { data?: TopicNode[] }) => setTopics(body.data ?? []))
      .catch(() => setTrainingsError(true))
      .finally(() => setIsLoadingTrainings(false));
  }, [isLoadingTeam, userTeam]);

  useEffect(() => {
    if (topics.length > 0) {
      setExpandedItems({ [String(topics[0].id)]: true });
    }
  }, [topics]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(timer);
  }, [celebration]);

  const toggleAccordion = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleComplete = (topicId: string, moduleId: string) => {
    const key = `${topicId}:${moduleId}`;
    const nextVal = !completedItems[key];

    const updatedItems = { ...completedItems, [key]: nextVal };
    setCompletedItems(updatedItems);
    localStorage.setItem("ace_completed_trainings", JSON.stringify(updatedItems));

    const updatedLog = { ...completionLog };
    if (nextVal) {
      updatedLog[key] = new Date().toISOString();
    } else {
      delete updatedLog[key];
    }
    setCompletionLog(updatedLog);
    localStorage.setItem("ace_completion_log", JSON.stringify(updatedLog));

    if (nextVal) {
      const topic = topics.find((t) => String(t.id) === topicId);
      if (topic && topic.modules.every((m) => updatedItems[`${topicId}:${String(m.id)}`])) {
        setCelebration(`🎉 "${topic.title}" mastered — every module complete!`);
      }
    }
  };

  const filteredTopics = topics.filter((topic) => {
    const query = searchQuery.toLowerCase();
    return (
      topic.title.toLowerCase().includes(query) ||
      topic.modules.some((m) => m.title.toLowerCase().includes(query))
    );
  });

  const allModuleKeys = topics.flatMap((t) => t.modules.map((m) => `${t.id}:${String(m.id)}`));
  const totalModules = allModuleKeys.length;
  const completedCount = allModuleKeys.filter((k) => completedItems[k]).length;
  const completionPct = totalModules ? Math.round((completedCount / totalModules) * 100) : 0;
  const xp = completedCount * XP_PER_MODULE;
  const level = getLevel(xp);
  // const streak = computeStreak(completionLog);

  return (
    <AppShell currentTab="functionaltraining">
      <div className="ph">
        <h2>Functional Training</h2>
        <p>
          ✦ {userTeam ? `Training for your team — ${userTeam}` : "Global training and resources"}
        </p>
        {/* {totalModules > 0 && (
          <div className="ace-level-chip" style={{ color: level.color, borderColor: level.color }}>
            🏅 Level {LEVELS.indexOf(level) + 1} · {level.name} · {xp} XP
          </div>
        )} */}
      </div>

      {/* <div className="ace-sf-banner">
        <img src={salesforceIcon.src} alt="Salesforce" className="ace-sf-icon" />
        <div className="ace-sf-text">
          <span className="ace-sf-title">Salesforce Training</span>
          <span className="ace-sf-sub">All topics and modules below are part of the Salesforce training program</span>
        </div>
      </div> */}

      {totalModules > 0 && (
        <div className="ace-stats">
          <div className="ace-stat c-purple">
            <div className="ace-stat-val">{totalModules}</div>
            <div className="ace-stat-lbl">Total modules</div>
          </div>
          <div className="ace-stat c-orange">
            <div className="ace-stat-val">{completedCount}</div>
            <div className="ace-stat-lbl">Completed</div>
          </div>
          <div className="ace-stat c-green">
            <div className="ace-stat-val">{completionPct}%</div>
            <div className="ace-stat-lbl">Overall progress</div>
          </div>
          {/* <div className="ace-stat c-cyan">
            <div className="ace-stat-val">🔥 {streak}</div>
            <div className="ace-stat-lbl">Day streak</div>
          </div> */}
        </div>
      )}

      <div className="ace-sf-container">
        <div className="ace-search-container">
          <svg className="ace-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by team or course title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ace-search-input"
          />
        </div>

        <div className="ace-accordion-stack">
        {isLoadingTeam || isLoadingTrainings ? (
          <div className="empty">
            <div className="empty-ico">⏳</div>
            <p>Loading your team's training...</p>
          </div>
        ) : trainingsError ? (
          <div className="empty">
            <div className="empty-ico">⚠️</div>
            <p>Couldn't load functional training right now. Please try again later.</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">📂</div>
            <p>No functional training has been assigned to your team yet.</p>
          </div>
        ) : filteredTopics.length > 0 ? (
          filteredTopics.map((topic) => {
            const topicId = String(topic.id);
            const isOpen = !!expandedItems[topicId];
            const topicKeys = topic.modules.map((m) => `${topicId}:${String(m.id)}`);
            const topicDone = topicKeys.filter((k) => completedItems[k]).length;
            const topicTotal = topic.modules.length;
            const topicPct = topicTotal ? Math.round((topicDone / topicTotal) * 100) : 0;
            const status = topicPct === 100 ? "done" : topicPct > 0 ? "progress" : "todo";

            return (
              <div key={topicId} className={`ace-card ${isOpen ? "is-open" : ""}`}>

                <button
                  type="button"
                  onClick={() => toggleAccordion(topicId)}
                  className="ace-card-trigger"
                  aria-expanded={isOpen}
                >
                  <div className="ace-trigger-left">
                    <span className="ace-badge-id">{topicId}</span>
                    <span className="ace-team-name">{topic.title}</span>
                  </div>

                  <div className="ace-trigger-right">
                    <div className="ace-mini-track" title={`${topicDone} of ${topicTotal} complete`}>
                      <div className="ace-mini-fill" style={{ width: `${topicPct}%` }} />
                    </div>
                    <span className={`ace-status-badge ${status}`}>
                      {status === "done" ? "✓ Completed" : status === "progress" ? `${topicPct}% done` : "Not started"}
                    </span>

                    <svg
                      className={`ace-caret-icon ${isOpen ? "rotate-icon" : ""}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="ace-card-body">
                    <p className="ace-description">
                      Class recordings and resource pathways for {topic.team} — {topic.title}.
                    </p>

                    <div className="ace-module-list">
                      {topic.modules.map((item) => {
                        const moduleKey = `${topicId}:${String(item.id)}`;
                        const isDone = !!completedItems[moduleKey];
                        return (
                          <div key={item.id} className={`ace-module-row ${isDone ? "is-done" : ""}`}>
                            <button
                              type="button"
                              className={`ace-check-toggle ${isDone ? "is-done" : ""}`}
                              onClick={() => toggleComplete(topicId, String(item.id))}
                              aria-pressed={isDone}
                              aria-label={isDone ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
                            >
                              {isDone && (
                                <svg className="icon-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>

                            <span className="ace-module-title">{item.title}</span>

                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ace-watch-link"
                            >
                              <svg className="icon-play" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Watch</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty">
            <div className="empty-ico">🔍</div>
            <p>No matching courses found for "{searchQuery}".</p>
          </div>
        )}
        </div>
      </div>

      {celebration && <div className="toast ok on">{celebration}</div>}

      <style jsx>{`
        .ace-level-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid;
          border-radius: 20px;
          background: var(--surface2);
        }

        .ace-sf-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          max-width: 1100px;
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: var(--r2);
          border: 1px solid rgba(0, 161, 224, .3);
          background: linear-gradient(90deg, rgba(0, 161, 224, .1), rgba(0, 161, 224, .03));
        }
        .ace-sf-icon {
          width: 36px;
          height: 36px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .ace-sf-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .ace-sf-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
        }
        .ace-sf-sub {
          font-size: 0.8rem;
          color: var(--text2);
        }

        .ace-sf-container {
          max-width: 1100px;
          padding: 16px;
          border-radius: var(--r2);
          border: 1px dashed rgba(0, 161, 224, .35);
          background: rgba(0, 161, 224, .025);
          margin-bottom: 20px;
        }

        .ace-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
          max-width: 1100px;
        }
        .ace-stat {
          padding: 16px 18px;
          border-radius: var(--r2);
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .ace-stat.c-purple { border-color: rgba(109, 82, 232, .2); background: var(--purple-bg); }
        .ace-stat.c-orange { border-color: rgba(255, 107, 0, .2); background: rgba(255, 107, 0, .06); }
        .ace-stat.c-green { border-color: rgba(16, 185, 129, .2); background: var(--green-bg); }
        .ace-stat.c-cyan { border-color: rgba(14, 165, 201, .2); background: var(--cyan-bg); }
        .ace-stat-val { font-size: 24px; font-weight: 800; line-height: 1; color: var(--text); }
        .ace-stat-lbl { font-size: 12px; color: var(--text2); margin-top: 5px; }

        .ace-search-container {
          position: relative;
          max-width: 1100px;
          margin-bottom: 1.5rem;
        }
        .ace-search-input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.5rem;
          background-color: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--r);
          color: var(--text);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ace-search-input::placeholder { color: var(--text3); }
        .ace-search-input:focus {
          border-color: var(--purple);
          box-shadow: 0 0 0 3px var(--purple-bg);
        }
        .ace-search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          color: var(--text3);
          pointer-events: none;
        }

        .ace-accordion-stack {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          max-width: 1100px;
        }
        .ace-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r2);
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .ace-card.is-open { border-color: var(--border2); }

        .ace-card-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }
        .ace-card-trigger:hover { background-color: var(--surface2); }
        .ace-trigger-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
        .ace-trigger-right { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }

        .ace-badge-id {
          font-size: 0.75rem;
          font-family: monospace;
          background-color: var(--surface3);
          color: var(--purple-l);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .ace-team-name {
          color: var(--text);
          font-size: 0.95rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ace-mini-track {
          width: 72px;
          height: 6px;
          background: var(--surface3);
          border-radius: 3px;
          overflow: hidden;
          display: none;
        }
        .ace-mini-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--purple), var(--cyan));
          border-radius: 3px;
          transition: width .4s ease;
        }
        @media (min-width: 640px) {
          .ace-mini-track { display: block; }
        }

        .ace-status-badge {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          white-space: nowrap;
        }
        .ace-status-badge.done { background: var(--green-bg); color: var(--green-l); border: 1px solid rgba(16, 185, 129, .4); }
        .ace-status-badge.progress { background: var(--purple-bg); color: var(--purple-l); border: 1px solid rgba(109, 82, 232, .35); }
        .ace-status-badge.todo { background: var(--surface2); color: var(--text3); border: 1px solid var(--border); }

        .ace-caret-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: var(--text3);
          transition: transform 0.2s ease;
          transform: rotate(0deg);
        }
        .rotate-icon { transform: rotate(180deg); }

        .ace-card-body {
          padding: 0 1.25rem 1.25rem 1.25rem;
          background-color: var(--surface2);
          border-top: 1px solid var(--border);
        }
        .ace-description {
          font-size: 0.85rem;
          color: var(--text2);
          margin: 0.75rem 0 1rem 0;
        }

        .ace-module-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .ace-module-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--r);
          background: var(--surface);
          transition: border-color 0.2s, background-color 0.2s;
        }
        .ace-module-row.is-done {
          border-color: rgba(16, 185, 129, .3);
          background: var(--green-bg);
        }

        .ace-check-toggle {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid var(--border2);
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.15s ease;
        }
        .ace-check-toggle:hover { border-color: var(--green); }
        .ace-check-toggle.is-done { border-color: var(--green); background: var(--green); }
        .icon-tick { width: 0.7rem; height: 0.7rem; }

        .ace-module-title {
          flex: 1;
          font-size: 0.85rem;
          color: var(--text);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ace-module-row.is-done .ace-module-title {
          color: var(--text2);
          text-decoration: line-through;
          text-decoration-color: var(--text3);
        }

        .ace-watch-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.85rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          flex-shrink: 0;
          background-color: var(--cyan-bg);
          color: var(--cyan-l);
          border: 1px solid rgba(14, 165, 201, .3);
          transition: all 0.2s;
        }
        .ace-watch-link:hover { background-color: rgba(14, 165, 201, .22); }
        .icon-play { width: 0.8rem; height: 0.8rem; }
      `}</style>
    </AppShell>
  );
}
