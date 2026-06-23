import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldAlert, LayoutDashboard, ScanLine, FileText, BookOpen } from "lucide-react";
import { usePersona } from "@/lib/persona";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import type { Persona } from "@/lib/safety-data";

const NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: Persona[] }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["inspector", "manager"] },
  { to: "/analyze", label: "Hazard Analyzer", icon: ScanLine, roles: ["inspector"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["inspector", "manager"] },
  { to: "/knowledge", label: "EHSS Knowledge", icon: BookOpen, roles: ["inspector", "manager"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { persona, setPersona } = usePersona();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((n) => n.roles.includes(persona));

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <ShieldAlert className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Mattel</div>
              <div className="text-sm font-semibold text-foreground">EHSS SafetyVision</div>
            </div>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {items.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <label className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:block">
              View as
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as "inspector" | "manager")}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="inspector">Safety Inspector</option>
              <option value="manager">EHSS Manager</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Mattel EHSS SafetyVision · MVP Prototype · Demo data only
      </footer>
    </div>
  );
}

export function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const map = {
    LOW: "bg-risk-low/15 text-risk-low border-risk-low/30",
    MEDIUM: "bg-risk-medium/15 text-risk-medium border-risk-medium/40",
    HIGH: "bg-risk-high/15 text-risk-high border-risk-high/40",
    CRITICAL: "bg-risk-critical/15 text-risk-critical border-risk-critical/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        map[level],
      )}
    >
      {level}
    </span>
  );
}
