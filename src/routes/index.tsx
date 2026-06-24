import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listInspections, type InspectionRow } from "@/lib/inspections";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, PPE_LABEL, type PpeKey } from "@/lib/safety-data";
import {
  Activity, AlertTriangle, ShieldCheck, ShieldAlert, Camera,
  Bell, Mail, ScanLine,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { readOutbox, type EmailEnvelope } from "@/lib/notifications";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mattel EHSS SafetyVision" },
      { name: "description", content: "Real-time EHSS safety KPIs, hazard trends, and recent inspections." },
    ],
  }),
  component: Dashboard,
});

const STATUS_COLOR: Record<string, string> = {
  SAFE: "#16A34A",
  WARNING: "#EAB308",
  MODERATE: "#F97316",
  "HIGH RISK": "#DC2626",
  CRITICAL: "#7F1D1D",
};

function Dashboard() {
  const { primaryRole, profile } = useAuth();
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [outbox, setOutbox] = useState<EmailEnvelope[]>([]);
  const [flash, setFlash] = useState<InspectionRow | null>(null);

  useEffect(() => {
    void listInspections().then(setRows);
    setOutbox(readOutbox());

    const ch = supabase
      .channel("inspections-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inspections" },
        (payload) => {
          const row = payload.new as InspectionRow;
          setRows((r) => [row, ...r]);
          if (row.category >= 4) {
            setFlash(row);
            setTimeout(() => setFlash(null), 8000);
          }
          setOutbox(readOutbox());
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return rows.filter((r) => new Date(r.created_at) >= start);
  }, [rows]);

  const counts = useMemo(() => {
    const c = { total: rows.length, today: today.length, high: 0, critical: 0, ppeRate: 0, safe: 0 };
    let withPpe = 0;
    for (const r of rows) {
      if (r.category === 4) c.high++;
      if (r.category === 5) c.critical++;
      if (r.category === 1) c.safe++;
      if ((r.missing_ppe?.length ?? 0) === 0) withPpe++;
    }
    c.ppeRate = rows.length ? Math.round((withPpe / rows.length) * 100) : 100;
    return c;
  }, [rows, today]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = (map[r.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows]);

  const trendData = useMemo(() => {
    const days: Record<string, { date: string; count: number; risk: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0, risk: 0 };
    }
    for (const r of rows) {
      const k = new Date(r.created_at).toISOString().slice(0, 10);
      if (days[k]) {
        days[k].count++;
        days[k].risk += r.risk_score;
      }
    }
    return Object.values(days).map((d) => ({ ...d, risk: d.count ? Math.round(d.risk / d.count) : 0 }));
  }, [rows]);

  const ppeData = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) for (const p of r.missing_ppe ?? []) m[p] = (m[p] ?? 0) + 1;
    return (Object.keys(PPE_LABEL) as PpeKey[]).map((k) => ({ name: PPE_LABEL[k], count: m[k] ?? 0 }));
  }, [rows]);

  const recent = rows.slice(0, 8);

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Dashboard</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Good day{profile ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live EHSS safety overview · {primaryRole === "inspector" ? "your inspections" : "all sites"}
          </p>
        </div>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <ScanLine className="h-4 w-4" /> Run inspection
        </Link>
      </header>

      {flash && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border-l-4 border-risk-critical bg-risk-critical/10 px-4 py-3 text-sm">
          <ShieldAlert className="h-5 w-5 text-risk-critical" />
          <div className="flex-1">
            <strong>{flash.status}</strong> at {flash.area} · score {flash.risk_score} ·
            inspector {flash.inspector_name} · {new Date(flash.created_at).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} label="Today's inspections" value={counts.today} color="primary" />
        <Kpi icon={ShieldCheck} label="PPE compliance" value={`${counts.ppeRate}%`} color="success" />
        <Kpi icon={AlertTriangle} label="High risk" value={counts.high} color="warning" />
        <Kpi icon={ShieldAlert} label="Critical" value={counts.critical} color="critical" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Risk distribution" subtitle="By category">
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLOR[s.name] ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="No inspections yet" />
          )}
        </Card>

        <Card title="7-day trend" subtitle="Inspections & avg risk">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip />
              <Line yAxisId="left" dataKey="count" name="Inspections" stroke="#E60012" strokeWidth={2} />
              <Line yAxisId="right" dataKey="risk" name="Avg risk" stroke="#0EA5E9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Missing PPE breakdown" subtitle="All time">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ppeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#E60012" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Recent inspections" subtitle="Real-time feed" className="lg:col-span-2">
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map((r) => {
                const def = CATEGORIES[r.category];
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", def.badgeClass)}
                    >
                      {def.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.area}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.inspector_name} · {new Date(r.created_at).toLocaleString()} · {r.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">{r.risk_score}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">score</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty label="No inspections yet — try Run inspection above." />
          )}
        </Card>

        <Card title="Notification outbox" subtitle="Demo mode · in-app">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            All emails route to lorenjerem@gmail.com
          </div>
          {outbox.length ? (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {outbox.slice(0, 12).map((e, i) => (
                <li key={i} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{e.role}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(e.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold leading-snug">{e.subject}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty label="No notifications yet." />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, color }: {
  icon: typeof Activity; label: string; value: number | string;
  color: "primary" | "success" | "warning" | "critical";
}) {
  const cls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-risk-low/15 text-risk-low",
    warning: "bg-risk-high/15 text-risk-high",
    critical: "bg-risk-critical/15 text-risk-critical",
  }[color];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", cls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Card({ title, subtitle, className, children }: {
  title: string; subtitle?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
      <Camera className="mr-2 h-3.5 w-3.5" />
      {label}
    </div>
  );
}

