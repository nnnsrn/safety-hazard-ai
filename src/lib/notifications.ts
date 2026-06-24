// Role-aware notification dispatcher.
// In DEMO MODE all emails are routed to a single inbox.
// Templates are still differentiated by role + event type per spec.

import { toast } from "sonner";
import type { ScoreResult, HazardCategory } from "./safety-data";
import { CATEGORIES, PPE_LABEL, ENV_LABEL } from "./safety-data";

export const DEMO_RECIPIENT = "lorenjerem@gmail.com";

export type EmailEnvelope = {
  to: string;
  role: "INSPECTOR" | "MANAGER" | "ADMIN";
  subject: string;
  body: string;
  sentAt: string;
  meta: Record<string, unknown>;
};

const STORE_KEY = "ehss.outbox";

function persist(env: EmailEnvelope) {
  try {
    const list: EmailEnvelope[] = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]");
    list.unshift(env);
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export function readOutbox(): EmailEnvelope[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as EmailEnvelope[];
  } catch {
    return [];
  }
}

export function clearOutbox() {
  localStorage.removeItem(STORE_KEY);
}

function send(env: EmailEnvelope) {
  persist(env);
  toast.success(`📧 ${env.subject}`, {
    description: `Routed to ${env.to} · ${env.role}`,
    duration: 4500,
  });
}

// ---------- Templates ----------

function fmtList(items: string[]): string {
  return items.length ? items.map((i) => `• ${i}`).join("\n") : "• None";
}

type InspectionPayload = {
  inspectionId: string;
  inspector: string;
  area: string;
  result: ScoreResult;
  timestamp: Date;
};

export function notifyInspectionComplete(p: InspectionPayload) {
  const def = CATEGORIES[p.result.category];
  const body = [
    `Inspection ${p.inspectionId} completed successfully.`,
    ``,
    `Inspector: ${p.inspector}`,
    `Area: ${p.area}`,
    `Status: ${def.status}  |  Risk Score: ${p.result.score}/100  |  Category ${p.result.category}`,
    ``,
    `Missing PPE:`,
    fmtList(p.result.missingPpe.map((k) => PPE_LABEL[k])),
    ``,
    `Environmental Hazards:`,
    fmtList(p.result.envHazards.map((k) => ENV_LABEL[k])),
    ``,
    `Recommended Action: ${def.action}`,
    ``,
    `— Mattel EHSS SafetyVision`,
  ].join("\n");

  // Inspector confirmation
  send({
    to: DEMO_RECIPIENT,
    role: "INSPECTOR",
    subject: `[INSPECTOR] Inspection Report Generated — ${p.inspectionId}`,
    body,
    sentAt: new Date().toISOString(),
    meta: { inspectionId: p.inspectionId, category: p.result.category },
  });

  // Admin always gets full visibility
  send({
    to: DEMO_RECIPIENT,
    role: "ADMIN",
    subject: `[ADMIN] System Safety Report — ${def.status}`,
    body: `New inspection logged in the system.\n\n${body}`,
    sentAt: new Date().toISOString(),
    meta: { inspectionId: p.inspectionId, category: p.result.category },
  });

  // Manager only for cat ≥ 4
  if (p.result.category >= 4) {
    const subject =
      p.result.category === 5
        ? "[MANAGER] CRITICAL Hazard Detected — Immediate Action Required"
        : "[MANAGER] High Risk Hazard Detected — Corrective Action Required";

    send({
      to: DEMO_RECIPIENT,
      role: "MANAGER",
      subject,
      body: [
        `A ${def.status} hazard event has been logged by ${p.inspector}.`,
        ``,
        body,
        ``,
        `Please review and authorize corrective action.`,
      ].join("\n"),
      sentAt: new Date().toISOString(),
      meta: { inspectionId: p.inspectionId, category: p.result.category, severity: def.severity },
    });
  }
}

export function notifyDailySummary(stats: { total: number; high: number; critical: number }) {
  const body = [
    `Daily safety summary`,
    ``,
    `Total inspections today: ${stats.total}`,
    `High risk events: ${stats.high}`,
    `Critical events: ${stats.critical}`,
    ``,
    `— Mattel EHSS SafetyVision`,
  ].join("\n");
  send({
    to: DEMO_RECIPIENT,
    role: "MANAGER",
    subject: "[MANAGER] Daily Safety Summary",
    body,
    sentAt: new Date().toISOString(),
    meta: stats,
  });
}

export function categoryColorVar(c: HazardCategory) {
  return CATEGORIES[c].colorVar;
}
