import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Search, BookOpen, Send, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "EHSS Knowledge Base — Mattel EHSS SafetyVision" },
      { name: "description", content: "Searchable Mattel Global EHSS standards powered by RAG." },
    ],
  }),
  component: KnowledgePage,
});

const STANDARDS = [
  {
    code: "EHSS 4.2", title: "Head Protection (PPE)",
    body: "All personnel in designated production zones shall wear ANSI Z89.1 compliant hard hats. Supervisors must verify PPE compliance at shift start.",
    tags: ["PPE", "Production"],
  },
  {
    code: "EHSS 7.1", title: "Egress & Walkways",
    body: "Walkways and emergency egress paths shall remain clear of materials, pallets, and equipment at all times. Minimum 36 in (914 mm) clearance.",
    tags: ["Housekeeping", "Emergency"],
  },
  {
    code: "EHSS 9.3", title: "Hazardous Materials Storage",
    body: "Incompatible chemicals shall be segregated by class. Containers must be labeled per GHS and stored in secondary containment.",
    tags: ["Chemical", "Storage"],
  },
  {
    code: "EHSS 6.4", title: "Machine Guarding",
    body: "All points of operation, ingoing nip points, and rotating parts shall be guarded per OSHA 1910.212. Interlocks shall be functionally tested monthly.",
    tags: ["Machinery"],
  },
  {
    code: "EHSS 11.2", title: "Electrical Safety",
    body: "Energized work shall be performed only with an approved Energized Electrical Work Permit. Lockout/Tagout shall be applied to all other servicing.",
    tags: ["Electrical", "LOTO"],
  },
  {
    code: "EHSS 13.1", title: "Emergency Response",
    body: "Each site shall maintain an Emergency Action Plan reviewed annually. Drills shall occur at least twice per year per shift.",
    tags: ["Emergency"],
  },
];

function KnowledgePage() {
  const [q, setQ] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<null | { text: string; refs: string[] }>(null);
  const [thinking, setThinking] = useState(false);

  const filtered = STANDARDS.filter((s) =>
    (s.code + s.title + s.body + s.tags.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );

  function ask() {
    if (!question.trim()) return;
    setThinking(true);
    setAnswer(null);
    setTimeout(() => {
      setThinking(false);
      setAnswer({
        text:
          "Based on Mattel Global EHSS Standards, hard hats are required in all designated production zones (EHSS 4.2). When a hazard is observed, stop the work immediately, issue compliant PPE, and document the observation. Repeat violations should trigger refresher training under EHSS 2.5.",
        refs: ["EHSS 4.2 — Head Protection", "EHSS 2.5 — Training & Competency"],
      });
    }, 1400);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">Knowledge base</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Mattel Global EHSS Standards</h1>
        <p className="mt-1 text-sm text-muted-foreground">Searchable safety standards · powered by Retrieval-Augmented Generation.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Standards list */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search standards, e.g. 'walkway', 'PPE', 'lockout'…"
              className="w-full rounded-lg border border-border bg-card py-3 pl-10 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-3">
            {filtered.map((s) => (
              <article key={s.code} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{s.code}</span>
                      <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.tags.map((t) => (
                        <span key={t} className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No standards match "{q}".
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> EHSS AI Assistant
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask a safety question. Answers are grounded in Mattel EHSS documents via RAG.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="e.g. What's required for hard hats?"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                onClick={ask}
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 min-h-[140px] rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {thinking && <div className="text-muted-foreground">Searching knowledge base…</div>}
              {!thinking && !answer && (
                <div className="text-muted-foreground">Answers will appear here with citations.</div>
              )}
              {answer && (
                <div>
                  <p className="leading-relaxed text-foreground">{answer.text}</p>
                  <div className="mt-3 border-t border-border pt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sources</div>
                    <ul className="mt-1 space-y-0.5 text-xs text-primary">
                      {answer.refs.map((r) => <li key={r}>• {r}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
