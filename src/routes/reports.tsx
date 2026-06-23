import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RiskBadge } from "@/components/AppShell";
import { SAMPLE_INSPECTIONS, riskFromScore, riskScore } from "@/lib/safety-data";
import { Download, Printer, ShieldAlert } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Safety Reports — Mattel EHSS SafetyVision" },
      { name: "description", content: "Standardized safety observation reports generated from AI hazard analysis." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [activeId, setActiveId] = useState(SAMPLE_INSPECTIONS[0].id);
  const active = SAMPLE_INSPECTIONS.find((i) => i.id === activeId)!;

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Reports</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Safety observation reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Auto-generated, standardized format ready for sign-off and export.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* List */}
        <aside className="rounded-xl border border-border bg-card shadow-sm lg:col-span-1">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider">All reports</div>
          <ul>
            {SAMPLE_INSPECTIONS.map((ins) => {
              const top = ins.hazards
                .map((h) => riskFromScore(riskScore(h)))
                .sort((a, b) => ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(b) - ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(a))[0];
              const isActive = ins.id === activeId;
              return (
                <li key={ins.id}>
                  <button
                    onClick={() => setActiveId(ins.id)}
                    className={`w-full border-b border-border/60 px-4 py-3 text-left last:border-0 ${
                      isActive ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{ins.id}</span>
                      <RiskBadge level={top} />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{ins.area}</div>
                    <div className="text-xs text-muted-foreground">{ins.date} · {ins.inspector}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Report */}
        <article className="rounded-xl border border-border bg-card p-8 shadow-sm lg:col-span-3">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <ShieldAlert className="h-4 w-4" /> Mattel EHSS — Safety Observation Report
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground">{active.area}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                Report ID: <span className="font-mono">{active.id}</span> · {active.date}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            </div>
          </header>

          {/* Meta grid */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Field label="Inspector" value={active.inspector} />
            <Field label="Date" value={active.date} />
            <Field label="Area" value={active.area} />
            <Field label="Source" value={active.imageLabel} />
          </dl>

          {/* Summary */}
          <section className="mt-6 rounded-lg bg-muted/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Executive summary</div>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              AI analysis identified <strong>{active.hazards.length} hazard{active.hazards.length > 1 ? "s" : ""}</strong> in this inspection.
              Findings reference Mattel Global EHSS Standards. Highest-priority items require action within 24 hours.
            </p>
          </section>

          {/* Findings table */}
          <section className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">Findings & corrective actions</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Hazard</th>
                    <th className="px-3 py-2 font-medium">Risk</th>
                    <th className="px-3 py-2 font-medium">EHSS ref.</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {active.hazards.map((h, i) => (
                    <tr key={h.id + i} className="border-t border-border align-top">
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-foreground">{h.label}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{h.correctiveAction}</div>
                      </td>
                      <td className="px-3 py-3"><RiskBadge level={riskFromScore(riskScore(h))} /></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{h.ehssRef}</td>
                      <td className="px-3 py-3 text-xs">{h.owner}</td>
                      <td className="px-3 py-3 text-xs">{h.dueInDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Signoff */}
          <section className="mt-8 grid grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prepared by</div>
              <div className="mt-2 h-12 border-b border-border" />
              <div className="mt-1 text-sm font-medium text-foreground">{active.inspector} · Safety Inspector</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviewed by</div>
              <div className="mt-2 h-12 border-b border-border" />
              <div className="mt-1 text-sm font-medium text-muted-foreground">EHSS Manager</div>
            </div>
          </section>
        </article>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
