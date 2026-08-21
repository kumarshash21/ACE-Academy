// "use client";

// import { useState, useEffect } from "react";
// import AppShell from "../../components/AppShell";

// // Native navigation mappings to bind cleanly against your CSS definitions
// const COURSE_TABS = [
//   { id: "rtp", name: "Ranger RTP", icon: "🤖", cssClass: "rtp" },
//   { id: "ttp", name: "Ranger TTP", icon: "📦", cssClass: "ttp" },
//   { id: "tools", name: "Tools & Techniques", icon: "🛠️", cssClass: "tools" },
// ];

// interface ModuleResource {
//   label: string;
//   type: string;
//   url: string;
// }

// interface Module {
//   code: string;
//   title: string;
//   description: string;
//   resources?: ModuleResource[];
// }

// interface Topic {
//   title: string;
//   modules: Module[];
// }

// interface Level {
//   name: string;
//   topics: Topic[];
// }

// interface SyllabusData {
//   id: string;
//   name: string;
//   levels: Level[];
// }

// export default function SyllabusPage() {
//   const [activeId, setActiveId] = useState<string>("rtp");
//   const [activeLevel, setActiveLevel] = useState<string>("pathfinder");
//   const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

//   // Dynamic Firebase data tracking logic hook 
//   useEffect(() => {
//     async function fetchSyllabusData() {
//       setIsLoading(true);
//       try {
//         const response = await fetch(`/api/postgres/syllabus/${activeId}`);
//         if (response.ok) {
//           const data: SyllabusData = await response.json();
//           setSyllabus(data);
          
//           if (data?.levels && data.levels.length > 0) {
//             setActiveLevel(data.levels[0].name.toLowerCase().replace(/\s+/g, ""));
//           }
//         }
//       } catch (err) {
//         console.error("Error connecting with syllabus data tree:", err);
//       } finally {
//         setIsLoading(false);
//       }
//     }
//     fetchSyllabusData();
//     setExpandedModules({});
//   }, [activeId]);

//   const currentLevelData = syllabus?.levels?.find(
//     (l) => l.name.toLowerCase().replace(/\s+/g, "") === activeLevel.toLowerCase()
//   );

//   return (
//     <AppShell currentTab="syllabus">
//       <div className="ph">
//         <h2>Syllabus</h2>
//         <p>Browse curriculum content, access documentation and recommended videos for each module.</p>
//       </div>

//       {/* Product tabs system utilizing your native stylesheet hooks */}
//       <div className="ptabs">
//         {COURSE_TABS.map((tab) => {
//           const isActive = activeId === tab.id;
//           return (
//             <div
//               key={tab.id}
//               onClick={() => setActiveId(tab.id)}
//               className={`ptab ${tab.cssClass} ${isActive ? "on" : ""}`}
//             >
//               <span>{tab.icon}</span>
//               {tab.name}
//             </div>
//           );
//         })}
//       </div>

//       {/* Track levels switcher subheader system bar (.ltabs) */}
//       {!isLoading && syllabus && syllabus.levels?.length > 0 && (
//         <div className="ltabs">
//           {syllabus.levels.map((level) => {
//             const cleanName = level.name.toLowerCase().replace(/\s+/g, "");
//             const isActive = activeLevel === cleanName;
//             return (
//               <div
//                 key={level.name}
//                 onClick={() => setActiveLevel(cleanName)}
//                 className={`ltab ${cleanName} ${isActive ? "on" : ""}`}
//                 style={{ textTransform: "capitalize" }}
//               >
//                 {level.name}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Syllabus Layout Content Block mapping directly over native CSS grids */}
//       {isLoading ? (
//         <div className="empty">
//           <div className="empty-ico">⏳</div>
//           <p>Loading curriculum infrastructure configuration...</p>
//         </div>
//       ) : currentLevelData ? (
//         <div>
//           {currentLevelData.topics.map((topic, tIdx) => (
//             <div key={tIdx} style={{ marginBottom: "28px" }}>
              
//               {/* Category Segment Label Section */}
//               <div className="sec-label">
//                 <span>◆</span>
//                 {topic.title}
//               </div>

//               {/* Native Double-Column Layout Grid */}
//               <div className="mod-grid">
//                 {topic.modules.map((mod, mIdx) => {
//                   const moduleUniqueKey = mod.code || `${tIdx}-${mIdx}`;
//                   const isOpened = !!expandedModules[moduleUniqueKey];

//                   return (
//                     <div
//                       key={moduleUniqueKey}
//                       className={`mod-card ${isOpened ? "open" : ""}`}
//                       style={{
//                         background: "var(--surface)",
//                         border: "1px solid var(--border)"
//                       }}
//                     >
//                       {/* Interactive Header Accent Layer Grid Row */}
//                       <div
//                         className="mod-head"
//                         onClick={() =>
//                           setExpandedModules((prev) => ({
//                             ...prev,
//                             [moduleUniqueKey]: !prev[moduleUniqueKey],
//                           }))
//                         }
//                       >
//                         <span className="mod-code">{mod.code || "0.0.0"}</span>
//                         <span className="mod-title">{mod.title}</span>
//                         <span className="mod-chev">▼</span>
//                       </div>

//                       {/* Dropdown Body wrapper utilizing .mod-body layout block updates */}
//                       <div className="mod-body">
//                         <div className="mod-content-text">{mod.description}</div>
                        
//                         {mod.resources && mod.resources.length > 0 && (
//                           <div className="mod-links">
//                             {mod.resources.map((res, rIdx) => {
//                               const isVideo = res.type.toLowerCase() === "video";
//                               return (
//                                 <a
//                                   key={rIdx}
//                                   href={res.url}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className={`mod-link ${isVideo ? "vid" : "doc"}`}
//                                 >
//                                   <span>{isVideo ? "▶" : "📄"}</span>
//                                   {res.label}
//                                 </a>
//                               );
//                             })}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//             </div>
//           ))}
//         </div>
//       ) : (
//         <div className="empty">
//           <div className="empty-ico">📂</div>
//           <p>No content parameters mapped inside this certification index view.</p>
//         </div>
//       )}
//     </AppShell>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import AppShell from "../../components/AppShell";

// // Native navigation mappings to bind cleanly against your CSS definitions
// const COURSE_TABS = [
//   { id: "rtp", name: "Ranger RTP", icon: "🤖", cssClass: "rtp" },
//   { id: "ttp", name: "Ranger TTP", icon: "📦", cssClass: "ttp" },
//   { id: "tools", name: "Tools & Techniques", icon: "🛠️", cssClass: "tools" },
// ];

// interface ModuleResource {
//   label: string;
//   type: string;
//   url: string;
// }

// interface Module {
//   code: string;
//   title: string;
//   description: string;
//   resources?: ModuleResource[];
// }

// interface Topic {
//   title: string;
//   modules: Module[];
// }

// interface Level {
//   name: string;
//   topics: Topic[];
// }

// interface SyllabusData {
//   id: string;
//   name: string;
//   levels: Level[];
// }

// export default function SyllabusPage() {
//   const [activeId, setActiveId] = useState<string>("rtp");
//   const [activeLevel, setActiveLevel] = useState<string>("pathfinder");
//   const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
//   // State to track completed module codes/keys
//   const [completedModules, setCompletedModules] = useState<Record<string, boolean>>({});

//   // Dynamic Firebase data tracking logic hook 
//   useEffect(() => {
//     async function fetchSyllabusData() {
//       setIsLoading(true);
//       try {
//         const response = await fetch(`/api/postgres/syllabus/${activeId}`);
//         if (response.ok) {
//           const data: SyllabusData = await response.json();
//           setSyllabus(data);
          
//           if (data?.levels && data.levels.length > 0) {
//             setActiveLevel(data.levels[0].name.toLowerCase().replace(/\s+/g, ""));
//           }
//         }
//       } catch (err) {
//         console.error("Error connecting with syllabus data tree:", err);
//       } finally {
//         setIsLoading(false);
//       }
//     }
//     fetchSyllabusData();
//     setExpandedModules({});
//   }, [activeId]);

//   // Toggle completion handler
//   const handleToggleComplete = async (e: React.MouseEvent, moduleKey: string) => {
//     e.stopPropagation(); 
    
//     const nextState = !completedModules[moduleKey];
    
//     // Optimistic UI update
//     setCompletedModules((prev) => ({
//       ...prev,
//       [moduleKey]: nextState,
//     }));

//     // Optional: Sync completion status back to Firebase
//     try {
//       await fetch(`/api/postgres/user/progress/${activeId}`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ moduleKey, completed: nextState }),
//       });
//     } catch (err) {
//       console.error("Error saving progress sync:", err);
//     }
//   };

//   const currentLevelData = syllabus?.levels?.find(
//     (l) => l.name.toLowerCase().replace(/\s+/g, "") === activeLevel.toLowerCase()
//   );

//   return (
//     <AppShell currentTab="syllabus">
//       <div className="ph">
//         <h2>Syllabus</h2>
//         <p>Browse curriculum content, access documentation and recommended videos for each module.</p>
//       </div>

//       {/* Product tabs system utilizing your native stylesheet hooks */}
//       <div className="ptabs">
//         {COURSE_TABS.map((tab) => {
//           const isActive = activeId === tab.id;
//           return (
//             <div
//               key={tab.id}
//               onClick={() => setActiveId(tab.id)}
//               className={`ptab ${tab.cssClass} ${isActive ? "on" : ""}`}
//             >
//               <span>{tab.icon}</span>
//               {tab.name}
//             </div>
//           );
//         })}
//       </div>

//       {/* Track levels switcher subheader system bar (.ltabs) */}
//       {!isLoading && syllabus && syllabus.levels?.length > 0 && (
//         <div className="ltabs">
//           {syllabus.levels.map((level) => {
//             const cleanName = level.name.toLowerCase().replace(/\s+/g, "");
//             const isActive = activeLevel === cleanName;
//             return (
//               <div
//                 key={level.name}
//                 onClick={() => setActiveLevel(cleanName)}
//                 className={`ltab ${cleanName} ${isActive ? "on" : ""}`}
//                 style={{ textTransform: "capitalize" }}
//               >
//                 {level.name}
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Syllabus Layout Content Block mapping directly over native CSS grids */}
//       {isLoading ? (
//         <div className="empty">
//           <div className="empty-ico">⏳</div>
//           <p>Loading curriculum infrastructure configuration...</p>
//         </div>
//       ) : currentLevelData ? (
//         <div>
//           {currentLevelData.topics.map((topic, tIdx) => (
//             <div key={tIdx} style={{ marginBottom: "28px" }}>
              
//               {/* Category Segment Label Section */}
//               <div className="sec-label">
//                 <span>◆</span>
//                 {topic.title}
//               </div>

//               {/* Native Double-Column Layout Grid */}
//               <div className="mod-grid">
//                 {topic.modules.map((mod, mIdx) => {
//                   const moduleUniqueKey = mod.code || `${tIdx}-${mIdx}`;
//                   const isOpened = !!expandedModules[moduleUniqueKey];
//                   const isCompleted = !!completedModules[moduleUniqueKey];

//                   return (
//                     <div
//                       key={moduleUniqueKey}
//                       className={`mod-card ${isOpened ? "open" : ""} ${isCompleted ? "completed" : ""}`}
//                       style={{
//                         background: "var(--surface)",
//                         border: "1px solid var(--border)",
//                       }}
//                     >
//                       {/* Interactive Header Accent Layer Grid Row */}
//                       <div
//                         className="mod-head"
//                         style={{ display: "flex", alignItems: "center", width: "100%" }}
//                         onClick={() =>
//                           setExpandedModules((prev) => ({
//                             ...prev,
//                             [moduleUniqueKey]: !prev[moduleUniqueKey],
//                           }))
//                         }
//                       >
//                         <span className="mod-code">{mod.code || "0.0.0"}</span>
//                         <span className="mod-title" style={{ flexGrow: 1 }}>{mod.title}</span>
                        
//                         {/* Dynamic Checkmark directly matching aesthetic in Screenshot 2026-06-07 at 1.54.37 PM_2.png */}
//                         {isCompleted && (
//                           <span 
//                             style={{ 
//                               color: "#10b981", 
//                               marginRight: "8px", 
//                               // fontWeight: "bold",
//                               fontSize: "1.0rem" 
//                             }}
//                           >
//                             ✓ Done
//                           </span>
//                         )}
                        
//                         <span 
//                           className="mod-chev" 
//                           style={{ 
//                             transform: isOpened ? "rotate(180deg)" : "none",
//                             transition: "transform 0.2s ease" 
//                           }}
//                         >
//                           ▼
//                         </span>
//                       </div>

//                       {/* Dropdown Body wrapper utilizing .mod-body layout block updates */}
//                       <div className="mod-body">
//                         <div className="mod-content-text" style={{ marginBottom: "16px" }}>
//                           {mod.description}
//                         </div>
                        
//                         {/* Middle-Right Action Section for Resources and Progress Toggles */}
//                         <div style={{ 
//                           display: "flex", 
//                           justifyContent: "space-between", 
//                           alignItems: "center", 
//                           gap: "16px",
//                           flexWrap: "wrap" 
//                         }}>
//                           {/* Left: Module links/resources tags */}
//                           <div className="mod-links" style={{ margin: 0, display: "flex", gap: "8px", flexWrap: "wrap" }}>
//                             {mod.resources && mod.resources.length > 0 && mod.resources.map((res, rIdx) => {
//                               const isVideo = res.type.toLowerCase() === "video";
//                               return (
//                                 <a
//                                   key={rIdx}
//                                   href={res.url}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className={`mod-link ${isVideo ? "vid" : "doc"}`}
//                                 >
//                                   <span>{isVideo ? "▶" : "📄"}</span>
//                                   {res.label}
//                                 </a>
//                               );
//                             })}
//                           </div>

//                           {/* Right: Pill Completion Toggle */}
//                           <div style={{ marginLeft: "auto", flexShrink: 0 }}>
//                             <button
//                               type="button"
//                               onClick={(e) => handleToggleComplete(e, moduleUniqueKey)}
//                               style={{
//                                 background: isCompleted ? "rgba(16, 185, 129, 0.08)" : "transparent",
//                                 color: isCompleted ? "#10b981" : "var(--text-muted, #888)", 
//                                 border: isCompleted ? "1px solid #10b981" : "1px solid var(--border, #444)",
//                                 padding: "6px 16px",
//                                 borderRadius: "20px", 
//                                 fontSize: "0.85rem",
//                                 cursor: "pointer",
//                                 fontWeight: 500,
//                                 display: "flex",
//                                 alignItems: "center",
//                                 gap: "6px",
//                                 whiteSpace: "nowrap",
//                                 transition: "all 0.2s ease"
//                               }}
//                               onMouseEnter={(e) => {
//                                 e.currentTarget.style.background = isCompleted 
//                                   ? "rgba(239, 68, 68, 0.08)" 
//                                   : "rgba(16, 185, 129, 0.15)";
//                                 if (isCompleted) {
//                                   e.currentTarget.style.color = "#ef4444"; 
//                                   e.currentTarget.style.borderColor = "#ef4444";
//                                 }
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.background = isCompleted ? "rgba(16, 185, 129, 0.08)" : "transparent";
//                                 e.currentTarget.style.color = isCompleted ? "#10b981" : "var(--text-muted, #888)";
//                                 e.currentTarget.style.borderColor = isCompleted ? "#10b981" : "1px solid var(--border, #444)";
//                               }}
//                             >
//                               {isCompleted ? (
//                                 <>
//                                   <span>✓</span> Completed
//                                 </>
//                               ) : (
//                                 "Mark as Done"
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                       </div>

//                     </div>
//                   );
//                 })}
//               </div>

//             </div>
//           ))}
//         </div>
//       ) : (
//         <div className="empty">
//           <div className="empty-ico">📂</div>
//           <p>No content parameters mapped inside this certification index view.</p>
//         </div>
//       )}
//     </AppShell>
//   );
// }


"use client";

import { useState, useEffect } from "react";
import AppShell from "../../components/AppShell";
import { apiUrl } from "@/lib/api";
import { normalizeResourceUrl } from "@/lib/url";
import { notifyDoneUpdated } from "@/lib/xp-streak";

const COURSE_TABS = [
  { id: "rtp", name: "Ranger RTP", icon: "🤖", cssClass: "rtp" },
  { id: "ttp", name: "Ranger TTP", icon: "📦", cssClass: "ttp" },
  { id: "tools", name: "Tools & Techniques", icon: "🛠️", cssClass: "tools" },
];

interface ModuleResource {
  label: string;
  type: string;
  url: string;
}

interface Module {
  code: string;
  title: string;
  description: string;
  resources?: ModuleResource[];
}

interface Topic {
  title: string;
  modules: Module[];
}

function compareModuleCode(a: string, b: string): number {
  const aParts = (a || "").split(".").map(Number);
  const bParts = (b || "").split(".").map(Number);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

// Reverses the "{productId}-{moduleCode}-{levelName}" key format used for
// Firestore/localStorage persistence back into its parts. productId and
// levelName never contain hyphens, so the first and last segments are safe
// anchors even if a module code ever grows one.
function parseProgressKey(key: string): { productId: string; moduleCode: string; levelName: string } | null {
  const parts = key.split("-");
  if (parts.length < 3) return null;
  return {
    productId: parts[0],
    moduleCode: parts.slice(1, -1).join("-"),
    levelName: parts[parts.length - 1],
  };
}

interface Level {
  name: string;
  topics: Topic[];
}

interface SyllabusData {
  id: string;
  name: string;
  levels: Level[];
}

export default function SyllabusPage() {
  const [activeId, setActiveId] = useState<string>("rtp");
  const [activeLevel, setActiveLevel] = useState<string>("pathfinder");
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  // Track completions globally across tabs and levels
  // Key format: "rtp-pathfinder::MOD_CODE" -> boolean
  const [completedModules, setCompletedModules] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("syllabus_completed_modules");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Hydrate completions from Firestore (source of truth) on load. The
  // sessionStorage seed above only survives within one tab session, so
  // without this, every fresh session would show real progress as unchecked
  // and a stray click on an already-done module would delete it server-side.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let sessionUserRaw: string | null = null;
    try {
      sessionUserRaw = localStorage.getItem("ace2_session_user");
    } catch (err) {
      console.error("Failed to read session user for progress hydration:", err);
      return;
    }

    let userId: string | undefined;
    try {
      userId = sessionUserRaw ? JSON.parse(sessionUserRaw)?.id : undefined;
    } catch (err) {
      console.error("Failed to parse session user for progress hydration:", err);
      return;
    }
    if (!userId) return;

    (async () => {
      try {
        const response = await fetch(apiUrl(`/api/postgres/user-progress/${userId}`));
        if (!response.ok) return;
        const data = await response.json();
        const done = data?.done && typeof data.done === "object" ? data.done : {};

        const hydrated: Record<string, boolean> = {};
        Object.keys(done).forEach((key) => {
          const parsed = parseProgressKey(key);
          if (!parsed) return;
          hydrated[`${parsed.productId}-${parsed.levelName}::${parsed.moduleCode}`] = true;
        });

        setCompletedModules((prev) => ({ ...hydrated, ...prev }));
      } catch (err) {
        console.error("Failed to load saved module progress:", err);
      }
    })();
  }, []);

  // Fetch API payload data mapping
  useEffect(() => {
    async function fetchSyllabusData() {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/postgres/syllabus/${activeId}`));
        if (response.ok) {
          const data: SyllabusData = await response.json();
          setSyllabus(data);
          
          if (data?.levels && data.levels.length > 0) {
            setActiveLevel(data.levels[0].name.toLowerCase().replace(/\s+/g, ""));
          }
        }
      } catch (err) {
        console.error("Error connecting with syllabus data tree:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSyllabusData();
    setExpandedModules({});
  }, [activeId]);

  // Recalculate segment metric counters whenever completions change
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Save detailed states
    sessionStorage.setItem("syllabus_completed_modules", JSON.stringify(completedModules));

    // Dynamically aggregate counts based on segment keys (e.g., "rtp-pathfinder")
    const counts: Record<string, number> = {};
    
    Object.entries(completedModules).forEach(([globalKey, isDone]) => {
      if (isDone) {
        const [segmentContext] = globalKey.split("::"); // Extracts "rtp-pathfinder"
        counts[segmentContext] = (counts[segmentContext] || 0) + 1;
      }
    });

    // Write counts cleanly to sessionStorage
    sessionStorage.setItem("syllabus_segment_counts", JSON.stringify(counts));
  }, [completedModules]);

  // Toggle completion handler bound safely to nested segments
 const handleToggleComplete = async (e: React.MouseEvent, moduleCode: string) => {
  e.stopPropagation(); 
  
  const currentSegmentKey = `${activeId}-${activeLevel}`;
  const globalModuleKey = `${currentSegmentKey}::${moduleCode}`;
  const nextState = !completedModules[globalModuleKey];
  
  // 1. Existing Optimistic React UI State update
  setCompletedModules((prev) => ({
    ...prev,
    [globalModuleKey]: nextState,
  }));

  // 2. ─── Sync with index.html's localStorage ───
  const sessionUserRaw = localStorage.getItem('ace2_session_user');
  let userId: string | undefined;
  try {
    userId = sessionUserRaw ? JSON.parse(sessionUserRaw)?.id : undefined;
  } catch (err) {
    console.error("Failed to read session user for progress sync:", err);
  }

  if (userId) {
    // Match the native string formatting exactly: "rtp-1.1.1-pathfinder"
    const htmlAppStructuralKey = `${activeId}-${moduleCode}-${activeLevel}`;

    try {
      // Pull down the main array index map index.html reads from
      const aceDone = JSON.parse(localStorage.getItem('ace2_done') || '{}');
      if (!aceDone[userId]) aceDone[userId] = {};

      if (nextState) {
        aceDone[userId][htmlAppStructuralKey] = new Date().toISOString();
      } else {
        delete aceDone[userId][htmlAppStructuralKey];
      }

      // Save it back. This event triggers the 'storage' listener in index.html!
      localStorage.setItem('ace2_done', JSON.stringify(aceDone));
      // 'storage' only fires in *other* tabs/frames — fire this so the sidebar's
      // XP/streak widget in this same tab updates immediately too.
      notifyDoneUpdated();
    } catch (err) {
      console.error("Failed to sync module progress to localStorage:", err);
    }

    try {
      // 3. Persist to Firestore (source of truth) as a single atomic field
      // write for just this module — no read-then-write, so it can't race
      // with another toggle that's still in flight.
      await fetch(apiUrl('/api/postgres/user-progress'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userId, moduleKey: htmlAppStructuralKey, isDone: nextState }),
      });
    } catch (err) {
      console.error("Failed to sync module progress to Firestore:", err);
    }
  }
};

  const currentLevelData = syllabus?.levels?.find(
    (l) => l.name.toLowerCase().replace(/\s+/g, "") === activeLevel.toLowerCase()
  );

  return (
    <AppShell currentTab="syllabus">
      <div className="ph">
        <h2>Syllabus</h2>
        <p>Browse curriculum content, access documentation and recommended videos for each module.</p>
      </div>

      {/* Product tabs system */}
      <div className="ptabs">
        {COURSE_TABS.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={`ptab ${tab.cssClass} ${isActive ? "on" : ""}`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </div>
          );
        })}
      </div>

      {/* Track levels switcher subheader system bar */}
      {!isLoading && syllabus && syllabus.levels?.length > 0 && (
        <div className="ltabs">
          {syllabus.levels.map((level) => {
            const cleanName = level.name.toLowerCase().replace(/\s+/g, "");
            const isActive = activeLevel === cleanName;
            return (
              <div
                key={level.name}
                onClick={() => setActiveLevel(cleanName)}
                className={`ltab ${cleanName} ${isActive ? "on" : ""}`}
                style={{ textTransform: "capitalize" }}
              >
                {level.name}
              </div>
            );
          })}
        </div>
      )}

      {/* Syllabus Layout Content Block */}
      {isLoading ? (
        <div className="empty">
          <div className="empty-ico">⏳</div>
          <p>Loading curriculum infrastructure configuration...</p>
        </div>
      ) : currentLevelData ? (
        <div>
          {currentLevelData.topics.map((topic, tIdx) => (
            <div key={tIdx} style={{ marginBottom: "28px" }}>
              
              <div className="sec-label">
                <span>◆</span>
                {topic.title}
              </div>

              <div className="mod-grid">
                {[...topic.modules].sort((a, b) => compareModuleCode(a.code, b.code)).map((mod, mIdx) => {
                  const moduleUniqueKey = mod.code || `${tIdx}-${mIdx}`;
                  const isOpened = !!expandedModules[moduleUniqueKey];
                  
                  // Compute completion matching our contextual namespace setup
                  const currentSegmentKey = `${activeId}-${activeLevel}`;
                  const isCompleted = !!completedModules[`${currentSegmentKey}::${moduleUniqueKey}`];

                  // Modules flagged as "coming soon" should have their resource links disabled
                  const isComingSoon = (mod.description || "").toLowerCase().includes("coming soon");

                  return (
                    <div
                      key={moduleUniqueKey}
                      className={`mod-card ${isOpened ? "open" : ""} ${isCompleted ? "completed" : ""}`}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="mod-head"
                        style={{ display: "flex", alignItems: "center", width: "100%" }}
                        onClick={() =>
                          setExpandedModules((prev) => ({
                            ...prev,
                            [moduleUniqueKey]: !prev[moduleUniqueKey],
                          }))
                        }
                      >
                        <span className="mod-code">{mod.code || "0.0.0"}</span>
                        <span className="mod-title" style={{ flexGrow: 1 }}>{mod.title}</span>
                        
                        {isCompleted && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#4ade80",
                            background: "rgba(74, 222, 128, 0.12)",
                            border: "1px solid rgba(74, 222, 128, 0.35)",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            marginRight: "8px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}>
                            <span style={{ fontSize: "0.9rem" }}>✓</span> Done
                          </span>
                        )}
                        
                        <span 
                          className="mod-chev" 
                          style={{ 
                            transform: isOpened ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease" 
                          }}
                        >
                          ▼
                        </span>
                      </div>

                      <div className="mod-body">
                        <div className="mod-content-text" style={{ marginBottom: "16px" }}>
                          {mod.description}
                        </div>
                        
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          gap: "16px",
                          flexWrap: "wrap" 
                        }}>
                          <div className="mod-links" style={{ margin: 0, display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {mod.resources && mod.resources.length > 0 && mod.resources
                              .map((res, rIdx) => {
                              const isVideo = res.type.toLowerCase() === "video";
                              return isComingSoon ? (
                                <span
                                  key={rIdx}
                                  className={`mod-link ${isVideo ? "vid" : "doc"} disabled`}
                                  aria-disabled="true"
                                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                                >
                                  <span>{isVideo ? "▶" : "📄"}</span>
                                  {res.label}
                                </span>
                              ) : (
                                <a
                                  key={rIdx}
                                  href={normalizeResourceUrl(res.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mod-link ${isVideo ? "vid" : "doc"}`}
                                >
                                  <span>{isVideo ? "▶" : "📄"}</span>
                                  {res.label}
                                </a>
                              );
                            })}
                          </div>

                          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                            {(() => {
                              const isHovered = hoveredModule === moduleUniqueKey;
                              const showUndo = isCompleted && isHovered;
                              return (
                                <button
                                  type="button"
                                  disabled={isComingSoon}
                                  onClick={(e) => {
                                    if (isComingSoon) return;
                                    handleToggleComplete(e, moduleUniqueKey);
                                  }}
                                  style={{
                                    background: isCompleted
                                      ? (showUndo ? "rgba(239, 68, 68, 0.08)" : "rgba(74, 222, 128, 0.12)")
                                      : (isHovered ? "rgba(74, 222, 128, 0.18)" : "rgba(74, 222, 128, 0.08)"),
                                    color: isCompleted
                                      ? (showUndo ? "#ef4444" : "#4ade80")
                                      : "#4ade80",
                                    border: isCompleted
                                      ? `1px solid ${showUndo ? "#ef4444" : "rgba(74, 222, 128, 0.45)"}`
                                      : "1px solid rgba(74, 222, 128, 0.45)",
                                    padding: "6px 16px",
                                    borderRadius: "20px",
                                    fontSize: "0.85rem",
                                    cursor: isComingSoon ? "not-allowed" : "pointer",
                                    opacity: isComingSoon ? 0.5 : 1,
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    minWidth: "128px",
                                    whiteSpace: "nowrap",
                                    transition: "background-color 0.28s cubic-bezier(0.4, 0, 0.2, 1), color 0.28s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1)"
                                  }}
                                  onMouseEnter={() => {
                                    if (isComingSoon) return;
                                    setHoveredModule(moduleUniqueKey);
                                  }}
                                  onMouseLeave={() => {
                                    if (isComingSoon) return;
                                    setHoveredModule((prev) => (prev === moduleUniqueKey ? null : prev));
                                  }}
                                >
                                  {isCompleted ? (
                                    showUndo ? (
                                      "Mark as Undone"
                                    ) : (
                                      <><span>✓</span> Completed</>
                                    )
                                  ) : (
                                    "Mark as Done"
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <div className="empty-ico">📂</div>
          <p>No content parameters mapped inside this certification index view.</p>
        </div>
      )}
    </AppShell>
  );
}