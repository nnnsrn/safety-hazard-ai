import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, RiskBadge } from "@/components/AppShell";
import { SAMPLE_INSPECTIONS, HAZARD_TRENDS, AREA_BREAKDOWN, riskFromScore, riskScore } from "@/lib/safety-data";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, ShieldCheck, Activity, TrendingUp, ScanLine, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Safety Dashboard — Mattel EHSS SafetyVision" },
      { name: "description", content: "Live view of plant-wide hazard trends, open findings, and inspection activity." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { primaryRole } = useAuth();
  const persona = primaryRole ?? "inspector";

  const allHazards = SAMPLE_INSPECTIONS.flatMap((i) => i.hazards);
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  allHazards.forEach((h) => {
    counts[riskFromScore(riskScore(h))]++;
  });

  const pieData = [
    { name: "Critical", value: counts.CRITICAL, color: "var(--risk-critical)" },
    { name: "High", value: counts.HIGH, color: "var(--risk-high)" },
    { name: "Medium", value: counts.MEDIUM, color: "var(--risk-medium)" },
    { name: "Low", value: counts.LOW, color: "var(--risk-low)" },
  ];

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {persona === "manager" ? "EHSS Manager View" : persona === "admin" ? "Administrator View" : "Inspector View"}
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Safety Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time hazard visibility across all Mattel manufacturing sites.
          </p>
        </div>
        {persona === "inspector" && (
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <ScanLine className="h-4 w-4" />
            New inspection
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's inspections" value="14" delta="+3 vs yesterday" icon={Activity} tone="default" />
        <KpiCard label="Critical findings" value={String(counts.CRITICAL)} delta="Open · needs action" icon={AlertTriangle} tone="critical" />
        <KpiCard label="High risk" value={String(counts.HIGH)} delta="Across 4 areas" icon={TrendingUp} tone="high" />
        <KpiCard label="Closed this week" value="38" delta="Avg 6.2h to close" icon={ShieldCheck} tone="ok" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Hazard trend (6 months)" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={HAZARD_TRENDS} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Critical" stroke="var(--risk-critical)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="High" stroke="var(--risk-high)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Medium" stroke="var(--risk-medium)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Low" stroke="var(--risk-low)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Risk distribution">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Hazards by area" className="lg:col-span-3">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={AREA_BREAKDOWN} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="area" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="hazards" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent inspections */}
      <Card title="Recent inspections" className="mt-6" action={
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Area</th>
                <th className="px-3 py-3 font-medium">Inspector</th>
                <th className="px-3 py-3 font-medium">Hazards</th>
                <th className="px-3 py-3 font-medium">Top risk</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {SAMPLE_INSPECTIONS.map((ins) => {
                const top = ins.hazards
                  .map((h) => ({ h, lvl: riskFromScore(riskScore(h)) }))
                  .sort((a, b) => riskScore(b.h) - riskScore(a.h))[0];
                return (
                  <tr key={ins.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-3 font-mono text-xs text-foreground">{ins.id}</td>
                    <td className="px-3 py-3 text-muted-foreground">{ins.date}</td>
                    <td className="px-3 py-3 font-medium text-foreground">{ins.area}</td>
                    <td className="px-3 py-3 text-muted-foreground">{ins.inspector}</td>
                    <td className="px-3 py-3">{ins.hazards.length}</td>
                    <td className="px-3 py-3"><RiskBadge level={top.lvl} /></td>
                    <td className="px-3 py-3 text-right">
                      <Link to="/reports" className="text-sm font-medium text-primary hover:underline">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}

function KpiCard({
  label, value, delta, icon: Icon, tone,
}: {
  label: string; value: string; delta: string;
  icon: typeof Activity;
  tone: "default" | "critical" | "high" | "ok";
}) {
  const toneClass = {
    default: "text-mattel-blue bg-mattel-blue/10",
    critical: "text-risk-critical bg-risk-critical/10",
    high: "text-risk-high bg-risk-high/10",
    ok: "text-risk-low bg-risk-low/10",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{delta}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Card({
  title, children, className = "", action,
}: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
