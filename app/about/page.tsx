"use client";

import AppShell from "../../components/AppShell";

const PILLARS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 6.5C10.5 5 8 4 5 4v13c3 0 5.5 1 7 2.5C13.5 18 16 17 19 17V4c-3 0-5.5 1-7 2.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6.5V19.5" strokeLinecap="round" />
      </svg>
    ),
    tint: "#3197f5",
    title: "What is ACE Academy?",
    text: "ACE Academy is GreyOrange's internal learning platform for structured syllabuses, assessments, functional training, and certifications into a single place — so every learner has a clear, guided path from onboarding to mastery.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </svg>
    ),
    tint: "#56d364",
    title: "Our Aim",
    text: "We want to raise the bar for automation and robotics expertise across GreyOrange by making high-quality training accessible, measurable, and consistent for every team — so engineers, field teams, and partners can certify their skills with confidence and keep growing as our systems evolve.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
        <circle cx="17.5" cy="9" r="2.2" />
        <path d="M15.5 13.2c2.2.4 3.9 2.3 4 4.5" strokeLinecap="round" />
      </svg>
    ),
    tint: "#d29922",
    title: "Team Behind It",
    text: "ACE Academy is built and maintained by a small, dedicated team at Automation, Support Team at GreyOrange passionate about learning and enablement — combining product knowledge, instructional design, and engineering to keep the platform useful and up to date for everyone in the organization.",
  },
];

export default function About() {
  return (
    <AppShell currentTab="about">
      <div className="ace-about-container">
        <div className="ace-hero">
          <div className="ace-hero-glow" />
          <span className="ace-hero-badge">✦ Accelerated Capability Engine</span>
          <h1 className="ace-hero-title">About ACE Academy</h1>
          <p className="ace-hero-subtitle">
            The home for structured, hands-on learning at GreyOrange — built to turn
            curiosity into certified expertise.
          </p>
        </div>

        <div className="ace-pillar-grid">
          {PILLARS.map((p) => (
            <section key={p.title} className="ace-pillar-card">
              <div className="ace-pillar-icon" style={{ color: p.tint, borderColor: `${p.tint}40`, background: `${p.tint}14` }}>
                {p.icon}
              </div>
              <h3 className="ace-pillar-title">{p.title}</h3>
              <p className="ace-pillar-text">{p.text}</p>
            </section>
          ))}
        </div>

        <section className="ace-contact-section">
          <div className="ace-contact-heading">
            <h3 className="ace-contact-title">Get in Touch</h3>
            <p className="ace-contact-subtitle">
              Have feedback, found an issue, or need help with ACE Academy? We're a click away.
            </p>
          </div>

          <div className="ace-contact-grid">
            <a href="mailto:kumar.s.int@greyorange.com" className="ace-contact-card">
              <div className="ace-contact-icon ace-icon-email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M4 7l7 5.5a1.6 1.6 0 0 0 2 0L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="ace-contact-body">
                <span className="ace-contact-label">Email us</span>
                <span className="ace-contact-value">kumar.s.int@greyorange.com</span>
              </div>
              <svg className="ace-contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            <a
              href="https://join.slack.com/share/enQtMTE3Mzc1NjUzNzU5NTMtYjk5OTM3YjcyNTlkNzAwYWQ4NGRiZTVkYjRkYTk1Mzg3NDEwYzhjZWQ3MDU4ZjJhMzVkMWIyMmYzMGFjMzgzYQ"
              target="_blank"
              rel="noopener noreferrer"
              className="ace-contact-card"
            >
              <div className="ace-contact-icon ace-icon-slack">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.5 2A2.5 2.5 0 006 4.5v6A2.5 2.5 0 008.5 13 2.5 2.5 0 0011 10.5v-6A2.5 2.5 0 008.5 2zm7 7A2.5 2.5 0 0013 11.5v6A2.5 2.5 0 0015.5 20 2.5 2.5 0 0018 17.5v-6A2.5 2.5 0 0015.5 9zM4.5 8A2.5 2.5 0 002 10.5 2.5 2.5 0 004.5 13H7V8H4.5zm11 8H13v5h2.5a2.5 2.5 0 002.5-2.5A2.5 2.5 0 0015.5 16zM19.5 6H17v5h2.5A2.5 2.5 0 0022 8.5 2.5 2.5 0 0019.5 6zM8 4.5V7H5.5A2.5 2.5 0 013 4.5 2.5 2.5 0 015.5 2 2.5 2.5 0 018 4.5z" />
                </svg>
              </div>
              <div className="ace-contact-body">
                <span className="ace-contact-label">Join the help channel</span>
                <span className="ace-contact-value">#help-ace-academy on Slack</span>
              </div>
              <svg className="ace-contact-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </section>
      </div>

      <style jsx>{`
        .ace-about-container {
          background-color: #0b0e14;
          color: #adbac7;
          min-height: 100vh;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        }

        .ace-hero {
          position: relative;
          max-width: 1200px;
          padding: 3rem 2rem;
          margin-bottom: 2rem;
          border-radius: 14px;
          border: 1px solid #21262d;
          background: linear-gradient(180deg, #12161d 0%, #0e1116 100%);
          overflow: hidden;
        }
        .ace-hero-glow {
          position: absolute;
          top: -140px;
          left: 50%;
          transform: translateX(-50%);
          width: 620px;
          height: 320px;
          background: radial-gradient(closest-side, rgba(56, 139, 253, 0.28), rgba(56, 139, 253, 0));
          pointer-events: none;
        }
        .ace-hero-badge {
          position: relative;
          display: inline-flex;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #8ed2ef;
          background: rgba(56, 139, 253, 0.1);
          border: 1px solid rgba(56, 139, 253, 0.35);
          padding: 0.35rem 0.75rem;
          border-radius: 50px;
        }
        .ace-hero-title {
          position: relative;
          font-size: 2.25rem;
          font-weight: 700;
          color: #f0f6fc;
          margin: 1rem 0 0.6rem 0;
          letter-spacing: -0.5px;
        }
        .ace-hero-subtitle {
          position: relative;
          font-size: 1rem;
          line-height: 1.6;
          color: #8b949e;
          margin: 0;
          max-width: 620px;
        }

        .ace-pillar-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 1200px;
          margin-bottom: 1.75rem;
        }
        .ace-pillar-card {
          background-color: #15191e;
          border: 1px solid #373e47;
          border-radius: 10px;
          padding: 1.5rem;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ace-pillar-card:hover {
          transform: translateY(-3px);
          border-color: #4493f8;
          box-shadow: 0 12px 24px -12px rgba(56, 139, 253, 0.35);
        }
        .ace-pillar-icon {
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid;
          margin-bottom: 1rem;
        }
        .ace-pillar-icon svg {
          width: 1.3rem;
          height: 1.3rem;
        }
        .ace-pillar-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f0f6fc;
          margin: 0 0 0.6rem 0;
        }
        .ace-pillar-text {
          font-size: 0.85rem;
          line-height: 1.65;
          color: #8b949e;
          margin: 0;
        }

        .ace-contact-section {
          max-width: 1200px;
        }
        .ace-contact-heading {
          margin-bottom: 1rem;
        }
        .ace-contact-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f0f6fc;
          margin: 0 0 0.35rem 0;
        }
        .ace-contact-subtitle {
          font-size: 0.85rem;
          color: #768390;
          margin: 0;
        }

        .ace-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .ace-contact-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.1rem 1.25rem;
          background-color: #15191e;
          border: 1px solid #373e47;
          border-radius: 10px;
          text-decoration: none;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .ace-contact-card:hover {
          transform: translateY(-2px);
          border-color: #4493f8;
          box-shadow: 0 12px 24px -14px rgba(56, 139, 253, 0.4);
        }
        .ace-contact-card:hover .ace-contact-arrow {
          transform: translateX(3px);
          color: #8ed2ef;
        }
        .ace-contact-icon {
          flex-shrink: 0;
          width: 2.75rem;
          height: 2.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid #1f3e4e;
        }
        .ace-contact-icon svg {
          width: 1.35rem;
          height: 1.35rem;
        }
        .ace-icon-email {
          background: rgba(49, 151, 245, 0.12);
          color: #3197f5;
        }
        .ace-icon-slack {
          background: rgba(210, 153, 34, 0.12);
          color: #d29922;
          border-color: rgba(210, 153, 34, 0.3);
        }
        .ace-contact-body {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }
        .ace-contact-label {
          font-size: 0.75rem;
          color: #768390;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
        }
        .ace-contact-value {
          font-size: 0.9rem;
          color: #f0f6fc;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ace-contact-arrow {
          margin-left: auto;
          width: 1.1rem;
          height: 1.1rem;
          color: #4493f8;
          transition: transform 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .ace-pillar-grid {
            grid-template-columns: 1fr;
          }
          .ace-contact-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
