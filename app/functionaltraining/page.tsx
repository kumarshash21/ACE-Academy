"use client";

import { useState, useEffect } from "react";
import AppShell from "../../components/AppShell";
import { getSessionUid, getSessionTeam } from "@/lib/session";
import { fetchUserProfile } from "@/lib/user-profile";
import { apiUrl } from "@/lib/api";

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

export default function FunctionalTraining() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
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

  const toggleAccordion = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleComplete = (id: string) => {
    setCompletedItems((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem("ace_completed_trainings", JSON.stringify(updated));
      return updated;
    });
  };

  const filteredTopics = topics.filter((topic) => {
    const query = searchQuery.toLowerCase();
    return (
      topic.title.toLowerCase().includes(query) ||
      topic.modules.some((m) => m.title.toLowerCase().includes(query))
    );
  });

  return (
    <AppShell currentTab="globalCourse">
      <div className="ace-dark-theme-container">
        
        <div className="ace-header-group">
          <h2 className="ace-title">Salesforce Courses</h2>
          <p className="ace-section-subtitle">
            ✦ {userTeam ? `Training for your team — ${userTeam}` : "Global training and resources"}
          </p>
        </div>

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
            <div className="ace-no-results">Loading your team's training...</div>
          ) : trainingsError ? (
            <div className="ace-no-results">
              Couldn't load functional training right now. Please try again later.
            </div>
          ) : topics.length === 0 ? (
            <div className="ace-no-results">
              No functional training has been assigned to your team yet.
            </div>
          ) : filteredTopics.length > 0 ? (
            filteredTopics.map((topic) => {
              const topicId = String(topic.id);
              const isOpen = !!expandedItems[topicId];

              return (
                <div key={topicId} className={`ace-card ${isOpen ? 'is-open' : ''}`}>

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

                      <div className="ace-body-actions-row">
                        <div className="ace-pill-wrapper">
                          {topic.modules.map((item) => (
                            <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="ace-pill ace-pill-video">
                              <svg className="icon-play" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>{item.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="ace-no-results">
              No matching courses found for "{searchQuery}".
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ace-dark-theme-container {
          background-color: #0b0e14;
          color: #adbac7;
          min-height: 100vh;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }
        .ace-header-group {
          margin-bottom: 1.5rem;
        }
        .ace-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f0f6fc;
          margin: 0;
        }
        .ace-section-subtitle {
          font-size: 0.70rem;
          color: #768390;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 1.5rem;
          font-weight: 600;
        }
        
        .ace-search-container {
          position: relative;
          max-width: 1200px;
          margin-bottom: 1.5rem;
        }
        .ace-search-input {
          width: 100%;
          padding: 0.55rem 1rem 0.55rem 2.5rem;
          background-color: #15191e;
          border: 1px solid #373e47;
          border-radius: 6px;
          color: #c9d1d9;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ace-search-input:focus {
          border-color: #388bfd;
          box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.15);
        }
        .ace-search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1rem;
          height: 1rem;
          color: #768390;
          pointer-events: none;
        }
        .ace-no-results {
          padding: 2rem;
          text-align: center;
          color: #768390;
          background-color: #15191e;
          border: 1px solid #373e47;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .ace-accordion-stack {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          max-width: 1200px;
        }
        .ace-card {
          background-color: #15191e;
          border: 1px solid #373e47;
          border-radius: 6px;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        
        /* Green border color modification removed from .ace-card-completed */
        .ace-card-completed {
          border-color: #373e47; 
        }

        .ace-card-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }
        .ace-card-trigger:hover {
          background-color: #1c2128;
        }
        .ace-trigger-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ace-trigger-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ace-badge-id {
          font-size: 0.75rem;
          font-family: monospace;
          background-color: #222831;
          color: #4493f8;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          border: 1px solid #373e47;
        }
        .ace-team-name {
          color: #f0f6fc;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .ace-tick-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #39d353;
          background-color: rgba(46, 160, 67, 0.15);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          border: 1px solid rgba(46, 160, 67, 0.4);
        }
        .icon-tick {
          width: 0.85rem;
          height: 0.85rem;
        }
        .ace-caret-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #768390;
          transition: transform 0.2s ease;
          transform: rotate(0deg);
        }
        .rotate-icon {
          transform: rotate(180deg);
        }
        .ace-card-body {
          padding: 0 1.25rem 1.25rem 1.25rem;
          background-color: #111418;
          border-top: 1px solid #222831;
        }
        .ace-description {
          font-size: 0.85rem;
          color: #768390;
          margin: 0.75rem 0 1rem 0;
        }
        .ace-body-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .ace-pill-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .ace-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.9rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        .ace-pill-video {
          background-color: #13232c;
          color: #8ed2ef;
          border: 1px solid #1f3e4e;
        }
        .ace-pill-video:hover {
          background-color: #1a323f;
        }
        .ace-pill-action {
          border: 1px solid transparent;
          background: none;
        }
        .action-pending {
          background-color: #21262d;
          color: #c9d1d9;
          border-color: #30363d;
        }
        .action-pending:hover {
          background-color: #2e353f;
          border-color: #8b949e;
        }
        .action-complete {
          background-color: #1f2d24;
          color: #56d364;
          border-color: #244b2d;
        }
        .action-complete:hover {
          background-color: #2b3e32;
          color: #f0f6fc;
        }
        .icon-play, .icon-action {
          width: 0.9rem;
          height: 0.9rem;
        }
        .icon-play { color: #3197f5; }
      `}</style>
    </AppShell>
  );
}