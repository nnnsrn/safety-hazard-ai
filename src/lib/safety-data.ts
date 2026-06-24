// ============================================================
// EHSS SafetyVision — Strict 5-Category Hazard Scoring System
// ============================================================

export type PpeKey = "helmet" | "vest" | "glasses" | "gloves" | "shoes";
export type EnvHazardKey = "wet_floor" | "obstacle" | "electrical" | "unsafe_area" | "fire" | "spill";

export const PPE_LABEL: Record<PpeKey, string> = {
  helmet: "Helmet",
  vest: "Safety Vest",
  glasses: "Safety Glasses",
  gloves: "Gloves",
  shoes: "Safety Shoes",
};

export const ENV_LABEL: Record<EnvHazardKey, string> = {
  wet_floor: "Wet Floor",
  obstacle: "Obstacle / Blocked Walkway",
  electrical: "Open Electrical Panel",
  unsafe_area: "Unsafe Area",
  fire: "Fire Hazard",
  spill: "Chemical Spill",
};

// Scoring weights (sum capped at 100)
export const PPE_WEIGHT: Record<PpeKey, number> = {
  helmet: 20,
  shoes: 20,
  vest: 15,
  gloves: 10,
  glasses: 10,
};

export const ENV_WEIGHT: Record<EnvHazardKey, number> = {
  electrical: 30,
  unsafe_area: 25,
  fire: 25,
  spill: 20,
  wet_floor: 20,
  obstacle: 15,
};

export type HazardCategory = 1 | 2 | 3 | 4 | 5;
export type RiskStatus = "SAFE" | "WARNING" | "MODERATE" | "HIGH RISK" | "CRITICAL";

export type CategoryDef = {
  id: HazardCategory;
  status: RiskStatus;
  severity: string;
  description: string;
  colorVar: string; // CSS variable to use
  badgeClass: string;
  action: string;
};

export const CATEGORIES: Record<HazardCategory, CategoryDef> = {
  1: {
    id: 1,
    status: "SAFE",
    severity: "Low",
    description: "Full PPE compliance, no hazards detected.",
    colorVar: "var(--risk-low)",
    badgeClass: "bg-risk-low/15 text-risk-low border-risk-low/40",
    action: "No corrective action required.",
  },
  2: {
    id: 2,
    status: "WARNING",
    severity: "Low–Moderate",
    description: "Single PPE missing.",
    colorVar: "var(--risk-medium)",
    badgeClass: "bg-risk-medium/15 text-risk-medium border-risk-medium/40",
    action: "Ensure full PPE compliance before entry.",
  },
  3: {
    id: 3,
    status: "MODERATE",
    severity: "Medium",
    description: "Multiple minor violations or single environmental hazard.",
    colorVar: "var(--risk-medium)",
    badgeClass: "bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-400",
    action: "Fix hazard before continuing work.",
  },
  4: {
    id: 4,
    status: "HIGH RISK",
    severity: "High",
    description: "Serious PPE violations or dangerous environmental condition.",
    colorVar: "var(--risk-high)",
    badgeClass: "bg-risk-high/15 text-risk-high border-risk-high/40",
    action: "Immediate supervisor intervention required.",
  },
  5: {
    id: 5,
    status: "CRITICAL",
    severity: "Critical",
    description: "Multiple severe hazards requiring immediate stop-work action.",
    colorVar: "var(--risk-critical)",
    badgeClass: "bg-risk-critical/15 text-risk-critical border-risk-critical/40",
    action: "STOP WORK IMMEDIATELY.",
  },
};

export type ScoreResult = {
  score: number;
  category: HazardCategory;
  status: RiskStatus;
  severity: string;
  action: string;
  missingPpe: PpeKey[];
  envHazards: EnvHazardKey[];
};

/**
 * Score & classify per the strict rubric.
 * Score = sum of weights, capped at 100.
 * Category is derived first from rule-based classification, then score breakpoints.
 */
export function classify(missingPpe: PpeKey[], envHazards: EnvHazardKey[]): ScoreResult {
  let score = 0;
  for (const p of missingPpe) score += PPE_WEIGHT[p];
  for (const e of envHazards) score += ENV_WEIGHT[e];
  if (score > 100) score = 100;

  let category: HazardCategory;

  const ppeCount = missingPpe.length;
  const envCount = envHazards.length;

  if (ppeCount === 0 && envCount === 0) category = 1;
  else if (ppeCount >= 1 && envCount >= 1 && (ppeCount >= 2 || score >= 60)) category = 5;
  else if (envCount >= 1 && (envHazards.some((h) => ENV_WEIGHT[h] >= 25))) category = 4;
  else if (ppeCount >= 3) category = 4;
  else if (ppeCount >= 2 || envCount >= 1) category = 3;
  else category = 2;

  // Score-based escalation (rule of thumb)
  if (score >= 81) category = 5;
  else if (score >= 61 && category < 4) category = 4;
  else if (score >= 41 && category < 3) category = 3;

  const def = CATEGORIES[category];
  return {
    score,
    category,
    status: def.status,
    severity: def.severity,
    action: def.action,
    missingPpe,
    envHazards,
  };
}

export function correctiveActionFor(r: ScoreResult): string {
  const parts: string[] = [];
  if (r.missingPpe.length) {
    parts.push(`Provide and require: ${r.missingPpe.map((p) => PPE_LABEL[p]).join(", ")}.`);
  }
  if (r.envHazards.length) {
    parts.push(`Mitigate: ${r.envHazards.map((e) => ENV_LABEL[e]).join(", ")}.`);
  }
  if (r.category >= 4) parts.push("Notify supervisor immediately.");
  if (r.category === 5) parts.push("STOP WORK until corrective measures are verified.");
  if (!parts.length) parts.push("Maintain current safety practices.");
  return parts.join(" ");
}

// EHSS standards mapping
export const EHSS_REFS: Partial<Record<PpeKey | EnvHazardKey, { ref: string; text: string }>> = {
  helmet: {
    ref: "Mattel EHSS Std. 4.2 — Head Protection",
    text: "All personnel in designated production zones shall wear ANSI Z89.1 compliant hard hats.",
  },
  vest: {
    ref: "Mattel EHSS Std. 4.5 — High-Visibility Apparel",
    text: "ANSI/ISEA 107 Class 2 vests required in areas with mobile equipment traffic.",
  },
  glasses: {
    ref: "Mattel EHSS Std. 4.3 — Eye & Face Protection",
    text: "ANSI Z87.1 compliant safety eyewear required in manufacturing and assembly zones.",
  },
  gloves: {
    ref: "Mattel EHSS Std. 4.4 — Hand Protection",
    text: "Task-appropriate gloves shall be worn for cutting, chemical handling, and material movement.",
  },
  shoes: {
    ref: "Mattel EHSS Std. 4.1 — Foot Protection",
    text: "ASTM F2413 safety footwear required in all production and warehouse areas.",
  },
  electrical: {
    ref: "Mattel EHSS Std. 11.2 — Electrical Safety",
    text: "Energized panels must remain closed; LOTO procedures apply during any service work.",
  },
  unsafe_area: {
    ref: "Mattel EHSS Std. 6.4 — Restricted Zones",
    text: "Workers shall not enter barricaded areas without authorization.",
  },
  fire: {
    ref: "Mattel EHSS Std. 8.1 — Fire Prevention",
    text: "Ignition sources must be controlled; egress paths must remain unobstructed.",
  },
  spill: {
    ref: "Mattel EHSS Std. 9.3 — Hazardous Materials",
    text: "Spills must be contained immediately per SDS; report to EHSS for cleanup verification.",
  },
  wet_floor: {
    ref: "Mattel EHSS Std. 7.2 — Slip, Trip & Fall Prevention",
    text: "Wet surfaces must be cordoned and signed until dry.",
  },
  obstacle: {
    ref: "Mattel EHSS Std. 7.1 — Egress & Walkways",
    text: "Walkways must maintain 36 in clearance and remain free of stored material.",
  },
};
