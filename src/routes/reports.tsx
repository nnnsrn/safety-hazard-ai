import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listInspections, type InspectionRow } from "@/lib/inspections";
import { CATEGORIES, PPE_LABEL, ENV_LABEL, type PpeKey, type EnvHazardKey } from "@/lib/safety-data";
import { exportInspectionPdf, exportInspectionsXlsx } from "@/lib/exporters";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, FileText, Filter, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Mattel EHSS SafetyVision" },
      { name: "description", content: "Auto-generated inspection reports with PDF and Excel export." },
    ],
  }),
  component: ReportsPage,
});

type Filt = "all" | "1" | "2" | "3" | "4" | "5";

function ReportsPage() {
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [filt, setFilt] = useState<Filt>("all");
  const [selected, setSelected] = useState<InspectionRow | null>(null);

  useEffect(() => {
    void listInspections().then(setRows);
    const ch = supabase
      .channel("reports-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "inspections" }, () => {
        void listInspections().then(setRows);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = filt === "all" ? rows : rows.filter((r) => String(r.category) === filt);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Reports</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Inspection reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generated from every detection · Export to PDF or Excel for audit
          </p>
        </div>
        <button
          onClick={() => exportInspectionsXlsx(filtered)}
          disabled={!filtered.length}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Excel
        </button>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        {(["all", "1", "2", "3", "4", "5"] as Filt[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilt(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filt === f ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
            )}
          >
            {f === "all" ? "All" : `Category ${f}`}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider">
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            </div>
            {filtered.length ? (
              <ul className="max-h-[640px] divide-y divide-border overflow-y-auto">
                {filtered.map((r) => {
                  const def = CATEGORIES[r.category];
                  const active = selected?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelected(r)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                          active ? "bg-primary/5" : "hover:bg-muted/40",
                        )}
                      >
                        <span className={cn("mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", def.badgeClass)}>
                          {def.status}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{r.area}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.inspector_name} · {new Date(r.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums">{r.risk_score}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No reports match filter
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <ReportDetail r={selected} />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
              Select a report to view details
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ReportDetail({ r }: { r: InspectionRow }) {
  const def = CATEGORIES[r.category];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="bg-primary px-6 py-4 text-primary-foreground">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Mattel · EHSS SafetyVision</div>
        <div className="text-lg font-semibold">Safety Inspection Report</div>
      </div>

      <div className="space-y-5 p-6">
        <div className={cn("flex items-center justify-between rounded-lg border p-4", def.badgeClass)}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Category {r.category} · {r.severity}
            </div>
            <div className="text-xl font-bold">{def.status}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums">{r.risk_score}</div>
            <div className="text-[10px] opacity-70">/ 100</div>
          </div>
        </div>

        <Grid>
          <Cell label="Inspection ID" value={r.id.slice(0, 8).toUpperCase()} mono />
          <Cell label="Date" value={new Date(r.created_at).toLocaleString()} />
          <Cell label="Inspector" value={r.inspector_name} />
          <Cell label="Email" value={r.inspector_email} />
          <Cell label="Area" value={r.area} />
          <Cell label="Source" value={r.source.toUpperCase()} />
        </Grid>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Missing PPE</div>
          <div className="flex flex-wrap gap-1.5">
            {r.missing_ppe.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            {r.missing_ppe.map((k) => (
              <span key={k} className="rounded-full border border-risk-high/40 bg-risk-high/10 px-2.5 py-0.5 text-xs font-medium text-risk-high">
                {PPE_LABEL[k as PpeKey] ?? k}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Environmental hazards</div>
          <div className="flex flex-wrap gap-1.5">
            {r.env_hazards.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
            {r.env_hazards.map((k) => (
              <span key={k} className="rounded-full border border-risk-critical/40 bg-risk-critical/10 px-2.5 py-0.5 text-xs font-medium text-risk-critical">
                {ENV_LABEL[k as EnvHazardKey] ?? k}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Corrective action</div>
          <p className="text-sm">{r.corrective_action}</p>
        </div>

        {r.image_data_url && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inspection image</div>
            <img src={r.image_data_url} alt="" className="max-h-72 rounded-lg border border-border" />
          </div>
        )}

        <div className="flex gap-2 border-t border-border pt-4">
          <button
            onClick={() => exportInspectionPdf(r)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <FileDown className="h-4 w-4" /> Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}
function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm", mono && "font-mono")}>{value}</div>
    </div>
  );
}
