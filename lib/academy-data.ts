export type CertId = "pathfinder" | "navigator" | "grandmaster" | "toolscert";

export type ProductSummary = {
  id: "rtp" | "ttp" | "tools";
  name: string;
  sub: string;
  icon: string;
  certs: CertId[];
  moduleCount: number;
};

export const CMETA: Record<
  CertId,
  { name: string; icon: string; color: string; desc: string }
> = {
  pathfinder: {
    name: "PathFinder",
    icon: "🧭",
    color: "purple",
    desc: "Concept & Problem Statement",
  },
  navigator: {
    name: "Navigator",
    icon: "🗺️",
    color: "cyan",
    desc: "UI Flow & System Logic",
  },
  grandmaster: {
    name: "Grand Master",
    icon: "🏆",
    color: "amber",
    desc: "Backend, DB & Tools",
  },
  toolscert: {
    name: "Tools Specialist",
    icon: "🛠️",
    color: "green",
    desc: "Tools & Techniques",
  },
};

export const PERSONA_CERTS: Record<string, CertId[]> = {
  TAC: ["pathfinder", "navigator", "grandmaster", "toolscert"],
  "Change Management": ["pathfinder", "navigator", "toolscert"],
  "Client Director": ["pathfinder", "navigator", "toolscert"],
  CEM: ["pathfinder", "toolscert"],
  CAC: ["pathfinder", "toolscert"],
  IM: ["pathfinder", "toolscert"],
  Management: ["pathfinder", "toolscert"],
  default: ["pathfinder", "navigator", "grandmaster", "toolscert"],
};

// Module counts mirror current curriculum size from legacy page.
export const PRODUCTS: ProductSummary[] = [
  {
    id: "rtp",
    name: "Ranger RTP",
    sub: "Rack to Person",
    icon: "🤖",
    certs: ["pathfinder", "navigator", "grandmaster"],
    moduleCount: 41,
  },
  {
    id: "ttp",
    name: "Ranger TTP",
    sub: "Tote to Person",
    icon: "📦",
    certs: ["pathfinder", "navigator", "grandmaster"],
    moduleCount: 12,
  },
  {
    id: "tools",
    name: "Tools & Techniques",
    sub: "Operational Toolkit",
    icon: "🛠️",
    certs: ["toolscert"],
    moduleCount: 27,
  },
];

export function getVisibleCerts(team: string, certs: CertId[]): CertId[] {
  const allowed = PERSONA_CERTS[team] ?? PERSONA_CERTS.default;
  return certs.filter((cert) => allowed.includes(cert));
}
