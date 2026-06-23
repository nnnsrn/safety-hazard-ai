export type Persona = "inspector" | "manager";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Hazard = {
  id: string;
  label: string;
  category: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number }; // % of image
  severity: number; // 1-5
  likelihood: number; // 1-5
  ehssRef: string;
  ehssText: string;
  correctiveAction: string;
  preventiveAction: string;
  owner: string;
  dueInDays: number;
};

export type Inspection = {
  id: string;
  date: string;
  area: string;
  inspector: string;
  imageLabel: string;
  hazards: Hazard[];
};

export function riskFromScore(score: number): RiskLevel {
  if (score >= 17) return "CRITICAL";
  if (score >= 11) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}

export function riskScore(h: Hazard) {
  return h.severity * h.likelihood;
}

export const SAMPLE_HAZARDS: Hazard[] = [
  {
    id: "h1",
    label: "Missing Helmet",
    category: "PPE Violation",
    confidence: 0.95,
    bbox: { x: 38, y: 12, w: 18, h: 22 },
    severity: 5,
    likelihood: 4,
    ehssRef: "Mattel EHSS Std. 4.2 — Head Protection",
    ehssText:
      "All personnel in designated production zones shall wear ANSI Z89.1 compliant hard hats. Supervisors must verify PPE compliance at shift start.",
    correctiveAction:
      "Stop work, issue and require hard hat before resuming. Coach worker and log observation.",
    preventiveAction:
      "Post PPE signage at zone entry. Add PPE check to daily pre-shift huddle.",
    owner: "Line Supervisor",
    dueInDays: 1,
  },
  {
    id: "h2",
    label: "Blocked Walkway",
    category: "Housekeeping",
    confidence: 0.88,
    bbox: { x: 8, y: 55, w: 42, h: 30 },
    severity: 3,
    likelihood: 4,
    ehssRef: "Mattel EHSS Std. 7.1 — Egress & Walkways",
    ehssText:
      "Walkways and emergency egress paths shall remain clear of materials, pallets, and equipment at all times (min. 36 in clearance).",
    correctiveAction:
      "Relocate pallets to staging area. Mark walkway boundaries with floor tape.",
    preventiveAction:
      "Add walkway audit to weekly 5S checklist; assign zone owner.",
    owner: "Warehouse Lead",
    dueInDays: 3,
  },
  {
    id: "h3",
    label: "Unsafe Chemical Storage",
    category: "Chemical Safety",
    confidence: 0.82,
    bbox: { x: 62, y: 40, w: 28, h: 38 },
    severity: 4,
    likelihood: 3,
    ehssRef: "Mattel EHSS Std. 9.3 — Hazardous Materials",
    ehssText:
      "Incompatible chemicals shall be segregated by class. Containers must be labeled per GHS and stored in secondary containment.",
    correctiveAction:
      "Segregate flammables from oxidizers. Verify GHS labels and add secondary containment.",
    preventiveAction:
      "Monthly chemical inventory audit; training refresher on SDS handling.",
    owner: "EHSS Officer",
    dueInDays: 7,
  },
];

export const SAMPLE_INSPECTIONS: Inspection[] = [
  {
    id: "INS-2026-0142",
    date: "2026-06-22",
    area: "Assembly Line A",
    inspector: "M. Tanaka",
    imageLabel: "line-a-shift2.jpg",
    hazards: [SAMPLE_HAZARDS[0], SAMPLE_HAZARDS[1]],
  },
  {
    id: "INS-2026-0141",
    date: "2026-06-22",
    area: "Warehouse B",
    inspector: "R. Alvarez",
    imageLabel: "wh-b-aisle3.jpg",
    hazards: [SAMPLE_HAZARDS[1]],
  },
  {
    id: "INS-2026-0140",
    date: "2026-06-21",
    area: "Paint Shop",
    inspector: "S. Okafor",
    imageLabel: "paint-storage.jpg",
    hazards: [SAMPLE_HAZARDS[2], SAMPLE_HAZARDS[0]],
  },
  {
    id: "INS-2026-0139",
    date: "2026-06-21",
    area: "Office — 2F",
    inspector: "L. Bianchi",
    imageLabel: "office-egress.jpg",
    hazards: [SAMPLE_HAZARDS[1]],
  },
  {
    id: "INS-2026-0138",
    date: "2026-06-20",
    area: "Molding",
    inspector: "M. Tanaka",
    imageLabel: "molding-zone.jpg",
    hazards: [SAMPLE_HAZARDS[0], SAMPLE_HAZARDS[2], SAMPLE_HAZARDS[1]],
  },
];

export const HAZARD_TRENDS = [
  { month: "Jan", Critical: 2, High: 6, Medium: 11, Low: 14 },
  { month: "Feb", Critical: 3, High: 8, Medium: 9, Low: 12 },
  { month: "Mar", Critical: 1, High: 5, Medium: 13, Low: 10 },
  { month: "Apr", Critical: 4, High: 9, Medium: 12, Low: 9 },
  { month: "May", Critical: 2, High: 7, Medium: 14, Low: 11 },
  { month: "Jun", Critical: 3, High: 10, Medium: 12, Low: 13 },
];

export const AREA_BREAKDOWN = [
  { area: "Assembly A", hazards: 18 },
  { area: "Assembly B", hazards: 12 },
  { area: "Warehouse", hazards: 22 },
  { area: "Paint Shop", hazards: 9 },
  { area: "Molding", hazards: 15 },
  { area: "Office", hazards: 5 },
];
