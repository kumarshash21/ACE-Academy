// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import logo from "../public/assets/img/GO_LOGO.jpg"
// // 1. Bring in your session loader function (or import it if it's in another file)
// function loadSavedSession() {
//   try {
//     const raw = localStorage.getItem('ace2_session_user');
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     return parsed && typeof parsed === 'object' ? parsed : null;
//   } catch (_err) {
//     localStorage.removeItem('ace2_session_user');
//     return null;
//   }
// }

// interface UserType {
//   name: string;
//   team: string;
//   role: "admin" | "learner";
//   av: string;
// }

// interface AppShellProps {
//   children: React.ReactNode;
//   currentTab: string;
// }

// const DEFAULT_USER: UserType = {
//   name: "Anish Kumar",
//   team: "TAC",
//   role: "learner",
//   av: "AK",
// };

// function normalizeUser(savedUser: { name?: string; team?: string; role?: string; av?: string }): UserType {
//   return {
//     name: savedUser.name || DEFAULT_USER.name,
//     team: savedUser.team || DEFAULT_USER.team,
//     role: savedUser.role === "admin" ? "admin" : "learner",
//     // Fallback initials generator if 'av' doesn't exist in localstorage
//     av: savedUser.av || (savedUser.name ? savedUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "AK"),
//   };
// }

// // Each routed page renders its own <AppShell>, so the shell remounts on every
// // navigation. Caching the resolved user at module scope lets a remount paint the
// // correct user/admin state in the first frame instead of flashing the default
// // user and popping the Admin section in after the effect runs.
// let cachedUser: UserType | null = null;

// export default function AppShell({ children, currentTab }: AppShellProps) {
//   const router = useRouter();

//   // 2. Initialize from the cached session (falls back to default on first load / SSR)
//   const [user, setUser] = useState<UserType>(cachedUser ?? DEFAULT_USER);

//   // 3. Load the session safely after mounting on the client side
//   useEffect(() => {
//     const savedUser = loadSavedSession();
//     if (savedUser) {
//       const normalized = normalizeUser(savedUser);
//       cachedUser = normalized;
//       setUser(normalized);
//     }
//   }, []);

//   const hrefFor = (tabName: string) => (tabName === "dash" ? "/" : `/${tabName}`);

//   const handleLogout = () => {
//     // 4. Clear localStorage on logout
//     cachedUser = null;
//     localStorage.removeItem('ace2_session_user');
//     localStorage.clear();
//     console.log("Signing out user...");
//     router.push("/");
//   };

//   return (
//     <div id="app" className="on">
//       {/* ─── TOPBAR ─── */}
//       <div className="topbar">
//         <div className="tb-left">
//           <div className="tb-logo">
//             <img src={logo.src} alt="GreyOrange Logo" width="26" height="26" style={{borderRadius: '5px'}} />
//             <span className="tb-brand">ACE Academy</span>
//           </div>
//           <div className="tb-divider"></div>
//           <span className="tb-tag">Automation Certification &amp; Excellence</span>
//         </div>

//         <div className="tb-right">
//           <div className="user-chip">
//             <div className="u-av" id="uAv">{user.av}</div>
//             <div>
//               <div className="u-name" id="uName">{user.name}</div>
//               <div className="u-team" id="uTeam">{user.team} · {user.role === "admin" ? "Admin" : "Learner"}</div>
//             </div>
//           </div>
//           <button className="btn-out" onClick={handleLogout}>Sign out</button>
//         </div>
//       </div>

//       {/* ─── MAIN LAYOUT CONTAINER ─── */}
//       <div className="shell">
//         {/* ─── SIDEBAR ─── */}
//         <div className="sidebar" id="sidebar">
//           <div className="sid-label">Learn</div>

//           <Link href={hrefFor("dash")} prefetch className={`nav ${currentTab === "dash" ? "on" : ""}`}>
//             <span className="nav-ico">⊞</span>Dashboard
//           </Link>
//           <Link href={hrefFor("syllabus")} prefetch className={`nav ${currentTab === "syllabus" ? "on" : ""}`}>
//             <span className="nav-ico">◈</span>Syllabus
//           </Link>
//           <Link href={hrefFor("assessment")} prefetch className={`nav ${currentTab === "assessment" ? "on" : ""}`}>
//             <span className="nav-ico">✎</span>Assessments
//           </Link>
//           <Link href={hrefFor("certifications")} prefetch className={`nav ${currentTab === "certifications" ? "on" : ""}`}>
//             <span className="nav-ico">◎</span>My Certifications
//           </Link>
//           <Link href={hrefFor("globalCourse")} prefetch className={`nav ${currentTab === "globalCourse" ? "on" : ""}`}>
//             <span className="nav-ico">◎</span>Global Course
//           </Link>

//           {/* Conditional Admin Sidebar Rendering */}
//           {user.role === "admin" && (
//             <>
//               <div className="sid-label">Admin</div>
//               <Link href={hrefFor("manageprogram")} prefetch className={`nav ${currentTab === "manageprogram" ? "on" : ""}`}>
//                 <span className="nav-ico">⚙</span>Manage Program
//               </Link>
//               <Link href={hrefFor("scores")} prefetch className={`nav ${currentTab === "scores" ? "on" : ""}`}>
//                 <span className="nav-ico">≡</span>All Scores
//               </Link>
//             </>
//           )}
//         </div>

//         {/* ─── DYNAMIC SCREEN CONTENT DISPLAY ─── */}
//         <div className="main" id="main">
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import Link from "next/link";
import logo from "../public/assets/img/GO_LOGO.jpg";
import { isSessionExpired } from "@/lib/session";

function loadSavedSession() {
  try {
    const raw = localStorage.getItem('ace2_session_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (isSessionExpired(parsed)) {
      localStorage.removeItem('ace2_session_user');
      return null;
    }
    return parsed;
  } catch (_err) {
    localStorage.removeItem('ace2_session_user');
    return null;
  }
}

interface UserType {
  name: string;
  team: string;
  role: "admin" | "learner";
  av: string;
}

interface AppShellProps {
  children: React.ReactNode;
  currentTab: string;
}

function normalizeUser(savedUser: { name?: string; team?: string; role?: string; av?: string }): UserType {
  const name = savedUser.name || "User";
  return {
    name,
    team: savedUser.team || "N/A",
    role: savedUser.role === "admin" ? "admin" : "learner",
    av: savedUser.av || name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
  };
}

let cachedUser: UserType | null = null;

const ADMIN_ONLY_TABS = ["manageprogram", "scores", "userprogress"];

export default function AppShell({ children, currentTab }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname(); // Get the current URL path
  const [user, setUser] = useState<UserType | null>(cachedUser);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!cachedUser);

  useEffect(() => {
    const savedUser = loadSavedSession();

    if (savedUser) {
      const normalized = normalizeUser(savedUser);
      if (ADMIN_ONLY_TABS.includes(currentTab) && normalized.role !== "admin") {
        cachedUser = normalized;
        router.push("/");
        return;
      }
      cachedUser = normalized;
      setUser(normalized);
      setIsCheckingAuth(false);
    } else {
      cachedUser = null;
      // Only redirect if they aren't already on the base login page "/"
      if (pathname !== "/") {
        router.push("/");
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [router, pathname, currentTab]);

  // Auto-logout once the 24hr session limit is reached, even if the tab is left open.
  useEffect(() => {
    const interval = setInterval(() => {
      if (cachedUser && !loadSavedSession()) {
        cachedUser = null;
        setUser(null);
        router.push("/");
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  // CRITICAL: If we have no user, and we are redirecting away from a sub-page,
  // do NOT render the layout or children. This stops the page flash completely.
  if (isCheckingAuth && pathname !== "/") {
    return null; // Or a loading spinner: <div className="loading">Loading...</div>
  }

  // Block rendering for non-admins on admin-only tabs while the redirect above takes effect.
  if (ADMIN_ONLY_TABS.includes(currentTab) && user?.role !== "admin") {
    return null;
  }

  const hrefFor = (tabName: string) => (tabName === "dash" ? "/" : `/${tabName}`);

  const handleLogout = () => {
    cachedUser = null;
    localStorage.removeItem('ace2_session_user');
    router.push("/");
  };

  return (
    <div id="app" className="on">
      {/* ─── TOPBAR ─── */}
      <div className="topbar">
        <div className="tb-left">
          <div className="tb-logo">
            <img src={logo.src} alt="GreyOrange Logo" width="26" height="26" style={{borderRadius: '5px'}} />
            <span className="tb-brand">ACE Academy</span>
          </div>
          <div className="tb-divider"></div>
          <span className="tb-tag">Automation Certification &amp; Excellence</span>
        </div>

        <div className="tb-right">
          {user && (
            <div className="user-chip">
              <div className="u-av" id="uAv">{user.av}</div>
              <div>
                <div className="u-name" id="uName">{user.name}</div>
                <div className="u-team" id="uTeam">{user.team} · {user.role === "admin" ? "Admin" : "Learner"}</div>
              </div>
            </div>
          )}
          <button className="btn-out" onClick={handleLogout}>Sign out</button>
        </div>
      </div>

      {/* ─── MAIN LAYOUT CONTAINER ─── */}
      <div className="shell">
        {/* ─── SIDEBAR ─── */}
        <div className="sidebar" id="sidebar">
          <div className="sid-label">Learn</div>

          <Link href={hrefFor("dash")} prefetch className={`nav ${currentTab === "dash" ? "on" : ""}`}>
            <span className="nav-ico">⊞</span>Dashboard
          </Link>
          <Link href={hrefFor("syllabus")} prefetch className={`nav ${currentTab === "syllabus" ? "on" : ""}`}>
            <span className="nav-ico">◈</span>Syllabus
          </Link>
          <Link href={hrefFor("assessment")} prefetch className={`nav ${currentTab === "assessment" ? "on" : ""}`}>
            <span className="nav-ico">✎</span>Assessments
          </Link>
          <Link href={hrefFor("certifications")} prefetch className={`nav ${currentTab === "certifications" ? "on" : ""}`}>
            <span className="nav-ico">◎</span>My Certifications
          </Link>
          <Link href={hrefFor("globalCourse")} prefetch className={`nav ${currentTab === "globalCourse" ? "on" : ""}`}>
            <span className="nav-ico">◎</span>Global Course
          </Link>

          {user?.role === "admin" && (
            <>
              <div className="sid-label">Admin</div>
              <Link href={hrefFor("manageprogram")} prefetch className={`nav ${currentTab === "manageprogram" ? "on" : ""}`}>
                <span className="nav-ico">⚙</span>Manage Program
              </Link>
              <Link href={hrefFor("scores")} prefetch className={`nav ${currentTab === "scores" ? "on" : ""}`}>
                <span className="nav-ico">≡</span>All Scores
              </Link>
              <Link href={hrefFor("userprogress")} prefetch className={`nav ${currentTab === "userprogress" ? "on" : ""}`}>
                <span className="nav-ico">◈</span>User Progress
              </Link>
            </>
          )}
        </div>

        <div className="main" id="main">
          {children}
        </div>
      </div>
    </div>
  );
}