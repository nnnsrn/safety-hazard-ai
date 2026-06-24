import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Mattel EHSS" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when arriving from the recovery link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also accept an existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function validate(p: string): string | null {
    if (p.length < 8) return "At least 8 characters required";
    if (!/[A-Z]/.test(p)) return "Add an uppercase letter";
    if (!/[a-z]/.test(p)) return "Add a lowercase letter";
    if (!/[0-9]/.test(p)) return "Add a number";
    if (!/[^A-Za-z0-9]/.test(p)) return "Add a special character";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw !== pw2) return setErr("Passwords don't match");
    const v = validate(pw);
    if (v) return setErr(v);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Password updated");
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">Mattel</div>
            <div className="text-base font-semibold">EHSS SafetyVision</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Must be 8+ chars with uppercase, lowercase, number, and special character.
          </p>
          {!ready ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for recovery session…
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  New password
                </label>
                <input
                  type="password"
                  required
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
