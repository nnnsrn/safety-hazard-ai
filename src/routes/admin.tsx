import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireRole } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — User Management — Mattel EHSS SafetyVision" },
      { name: "description", content: "Approve, reject and manage user accounts and roles." },
    ],
  }),
  component: AdminPage,
});

type Row = {
  id: string;
  email: string;
  full_name: string;
  employee_id: string;
  department: string;
  requested_role: "inspector" | "manager" | "admin";
  status: "pending" | "active" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

function AdminPage() {
  return (
    <AppShell>
      <RequireRole roles={["admin"]}>
        <AdminInner />
      </RequireRole>
    </AppShell>
  );
}

function AdminInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"pending" | "active" | "rejected" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data as Row[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("approve_account", { _user_id: id });
    setBusyId(null);
    if (error) return setErr(error.message);
    await load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reason for rejection?") ?? "";
    setBusyId(id);
    const { error } = await supabase.rpc("reject_account", { _user_id: id, _reason: reason });
    setBusyId(null);
    if (error) return setErr(error.message);
    await load();
  };

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    active: rows.filter((r) => r.status === "active").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Administrator</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve new access requests and manage active accounts.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Stat label="Pending" value={counts.pending} icon={Clock} tone="primary" />
        <Stat label="Active" value={counts.active} icon={ShieldCheck} tone="ok" />
        <Stat label="Rejected" value={counts.rejected} icon={ShieldX} tone="bad" />
      </div>

      <div className="mb-4 flex gap-1 rounded-md border border-border bg-card p-1 sm:max-w-md">
        {(["pending", "active", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Requested role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-foreground">{r.employee_id || "—"}</td>
                <td className="px-4 py-3 text-foreground">{r.department || "—"}</td>
                <td className="px-4 py-3 capitalize text-foreground">{r.requested_role}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" ? (
                    <div className="inline-flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => approve(r.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => reject(r.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No accounts in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tone: "primary" | "ok" | "bad";
}) {
  const toneCls =
    tone === "primary" ? "text-primary" : tone === "ok" ? "text-risk-low" : "text-destructive";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneCls)} />
      </div>
      <div className={cn("mt-1 text-2xl font-bold", toneCls)}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const map = {
    pending: "bg-primary/10 text-primary border-primary/30",
    active: "bg-risk-low/15 text-risk-low border-risk-low/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  } as const;
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider", map[status])}>
      {status}
    </span>
  );
}
