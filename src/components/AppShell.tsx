import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, LayoutDashboard, ScanLine, FileText, BookOpen, Users, LogOut, Clock, XCircle } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; roles: AppRole[] }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["inspector", "manager", "admin"] },
  { to: "/analyze", label: "Hazard Analyzer", icon: ScanLine, roles: ["inspector", "admin"] },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["inspector", "manager", "admin"] },
  { to: "/knowledge", label: "EHSS Knowledge", icon: BookOpen, roles: ["inspector", "manager", "admin"] },
  { to: "/admin", label: "Admin", icon: Users, roles: ["admin"] },
];

const ROLE_LABEL: Record<AppRole, string> = {
  inspector: "Safety Inspector",
  manager: "EHSS Manager",
  admin: "Administrator",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { loading, session, profile, primaryRole, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Preparing your account…</div>
      </div>
    );
  }
  if (profile.status === "pending") return <PendingScreen onSignOut={signOut} fullName={profile.full_name} />;
  if (profile.status === "rejected")
    return <RejectedScreen onSignOut={signOut} reason={profile.rejection_reason} />;

  const role = primaryRole ?? "inspector";
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <div className="min-h-screen bg-background">
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
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight text-foreground">{profile.full_name}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{ROLE_LABEL[role]}</div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
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

export function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { primaryRole } = useAuth();
  if (!primaryRole || !roles.includes(primaryRole)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">Access denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role ({primaryRole ?? "none"}) doesn't have permission to view this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const map = {
    LOW: "bg-risk-low/15 text-risk-low border-risk-low/30",
    MEDIUM: "bg-risk-medium/15 text-risk-medium border-risk-medium/40",
    HIGH: "bg-risk-high/15 text-risk-high border-risk-high/40",
    CRITICAL: "bg-risk-critical/15 text-risk-critical border-risk-critical/40",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider", map[level])}>
      {level}
    </span>
  );
}

// ---------- Auth screens ----------

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Mattel</div>
            <div className="text-base font-semibold text-foreground">EHSS SafetyVision</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {mode !== "forgot" && (
            <div className="mb-6 flex gap-1 rounded-md bg-muted p-1">
              <button
                onClick={() => setMode("login")}
                className={cn(
                  "flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Sign in
              </button>
              <button
                onClick={() => setMode("register")}
                className={cn(
                  "flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Request access
              </button>
            </div>
          )}
          {mode === "login" && <LoginForm onForgot={() => setMode("forgot")} />}
          {mode === "register" && <RegisterForm onDone={() => setMode("login")} />}
          {mode === "forgot" && <ForgotForm onBack={() => setMode("login")} />}
        </div>

        <DemoCredentials />

        <p className="mt-4 text-center text-xs text-muted-foreground">
          The first account created becomes the system Administrator.
        </p>
      </div>
    </div>
  );
}

function DemoCredentials() {
  const accounts = [
    { role: "Admin", email: "admin@ehss-ai.com", pass: "Admin123!" },
    { role: "Manager", email: "manager@ehss-ai.com", pass: "Manager123!" },
    { role: "Inspector", email: "inspector@ehss-ai.com", pass: "Inspector123!" },
  ];
  return (
    <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-xs">
      <div className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground">Demo accounts</div>
      <ul className="space-y-1">
        {accounts.map((a) => (
          <li key={a.email} className="flex items-center justify-between gap-3 font-mono">
            <span className="text-foreground">{a.email}</span>
            <span className="text-muted-foreground">{a.pass}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Register each address once with the matching password; they activate automatically.
      </p>
    </div>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // Auto-seed demo accounts so any of the three demo users gets immediate access
      try {
        await supabase.rpc("seed_demo_accounts");
        await refresh();
      } catch {}
    }
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} required />
      <Field label="Password" type="password" value={password} onChange={setPassword} required />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={onForgot}
        className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
      >
        Forgot password?
      </button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h3 className="text-base font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          If an account exists for {email}, a reset link is on its way.
        </p>
        <button onClick={onBack} className="text-sm font-medium text-primary hover:underline">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-base font-semibold">Reset your password</h3>
      <Field label="Email" type="email" value={email} onChange={setEmail} required />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <button type="button" onClick={onBack} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
        Back to sign in
      </button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    employee_id: "",
    department: "",
    requested_role: "inspector" as AppRole,
  });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: form.full_name,
          employee_id: form.employee_id,
          department: form.department,
          requested_role: form.requested_role,
        },
      },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOk(true);
    await supabase.auth.signOut();
  };

  if (ok)
    return (
      <div className="text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-3 text-base font-semibold text-foreground">Request submitted</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is pending administrator approval. You'll be able to sign in once it's activated.
        </p>
        <button onClick={onDone} className="mt-4 text-sm font-medium text-primary hover:underline">
          Back to sign in
        </button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Full name" value={form.full_name} onChange={set("full_name")} required />
      <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
      <Field label="Password" type="password" value={form.password} onChange={set("password")} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Employee ID" value={form.employee_id} onChange={set("employee_id")} required />
        <Field label="Department" value={form.department} onChange={set("department")} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Role requested</label>
        <select
          value={form.requested_role}
          onChange={(e) => set("requested_role")(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="inspector">Safety Inspector</option>
          <option value="manager">EHSS Manager</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function PendingScreen({ onSignOut, fullName }: { onSignOut: () => void; fullName: string }) {
  return (
    <CenteredCard>
      <Clock className="mx-auto h-12 w-12 text-primary" />
      <h2 className="mt-4 text-xl font-semibold text-foreground">Pending approval</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Hi {fullName}, your account is awaiting administrator approval. You'll get access as soon as it's activated.
      </p>
      <button
        onClick={onSignOut}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </CenteredCard>
  );
}

function RejectedScreen({ onSignOut, reason }: { onSignOut: () => void; reason: string | null }) {
  return (
    <CenteredCard>
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-xl font-semibold text-foreground">Account rejected</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your access request was not approved.
        {reason ? <span className="mt-2 block rounded-md bg-muted p-3 text-left text-xs">Reason: {reason}</span> : null}
      </p>
      <button
        onClick={onSignOut}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">{children}</div>
    </div>
  );
}
