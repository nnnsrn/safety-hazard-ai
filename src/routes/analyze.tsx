import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, RiskBadge } from "@/components/AppShell";
import { SAMPLE_HAZARDS, riskFromScore, riskScore, type Hazard } from "@/lib/safety-data";
import { Upload, Sparkles, FileText, BookOpen, RotateCcw, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Hazard Analyzer — Mattel EHSS SafetyVision" },
      { name: "description", content: "Upload a photo or video to detect workplace hazards with AI." },
    ],
  }),
  component: AnalyzePage,
});

type Stage = "upload" | "analyzing" | "results";

function AnalyzePage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Hazard | null>(null);
  const [showExplain, setShowExplain] = useState(false);

  const hazards = SAMPLE_HAZARDS;

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setStage("analyzing");
    setTimeout(() => {
      setStage("results");
      setSelected(hazards[0]);
    }, 1800);
  }

  function reset() {
    setImageUrl(null);
    setSelected(null);
    setStage("upload");
    setShowExplain(false);
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">AI Hazard Analyzer</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Detect hazards from an image</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Computer vision + EHSS RAG. Detects PPE violations, blocked egress, unsafe storage and more.
          </p>
        </div>
        {stage === "results" && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> New analysis
          </button>
        )}
      </div>

      {stage === "upload" && <UploadZone onFile={handleFile} />}

      {stage === "analyzing" && (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-sm">
          {imageUrl && (
            <img src={imageUrl} alt="" className="mx-auto mb-6 max-h-80 rounded-lg border border-border opacity-60" />
          )}
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
            <div className="text-base font-semibold text-foreground">Analyzing image…</div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Running YOLO object detection</p>
              <p>• Extracting OCR from signage</p>
              <p>• Querying Mattel EHSS knowledge base</p>
            </div>
          </div>
        </div>
      )}

      {stage === "results" && imageUrl && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Image w/ bounding boxes */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="relative">
                <img src={imageUrl} alt="Inspection" className="block w-full" />
                {hazards.map((h) => {
                  const lvl = riskFromScore(riskScore(h));
                  const color =
                    lvl === "CRITICAL" ? "var(--risk-critical)" :
                    lvl === "HIGH" ? "var(--risk-high)" :
                    lvl === "MEDIUM" ? "var(--risk-medium)" : "var(--risk-low)";
                  const active = selected?.id === h.id;
                  return (
                    <button
                      key={h.id}
                      onClick={() => { setSelected(h); setShowExplain(false); }}
                      className="absolute transition-all"
                      style={{
                        left: `${h.bbox.x}%`,
                        top: `${h.bbox.y}%`,
                        width: `${h.bbox.w}%`,
                        height: `${h.bbox.h}%`,
                        border: `2.5px solid ${color}`,
                        background: active ? `color-mix(in oklab, ${color} 18%, transparent)` : "transparent",
                        boxShadow: active ? `0 0 0 3px color-mix(in oklab, ${color} 30%, transparent)` : "none",
                      }}
                    >
                      <span
                        className="absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                        style={{ background: color }}
                      >
                        {h.label} · {Math.round(h.confidence * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>{hazards.length} hazards detected · 1.8s</span>
                <span className="font-mono">demo-image.jpg</span>
              </div>
            </div>
          </div>

          {/* Hazard list + detail */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider">
                Detected hazards
              </div>
              <ul>
                {hazards.map((h) => {
                  const lvl = riskFromScore(riskScore(h));
                  const active = selected?.id === h.id;
                  return (
                    <li key={h.id}>
                      <button
                        onClick={() => { setSelected(h); setShowExplain(false); }}
                        className={`flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left last:border-0 ${
                          active ? "bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-foreground">{h.label}</div>
                          <div className="text-xs text-muted-foreground">{h.category} · {Math.round(h.confidence * 100)}% conf.</div>
                        </div>
                        <RiskBadge level={lvl} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {selected && (
              <HazardDetail
                hazard={selected}
                showExplain={showExplain}
                onExplain={() => setShowExplain(true)}
              />
            )}

            <Link
              to="/reports"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" /> Generate safety observation report
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-16 text-center transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-7 w-7" />
        </div>
        <div className="mt-4 text-base font-semibold text-foreground">Upload an image or video</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Drag and drop a file here, or click to browse. JPG, PNG, MP4 up to 50&nbsp;MB.
        </div>
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          {["Missing PPE", "Blocked walkway", "Unsafe storage", "Poor housekeeping", "Electrical hazard"].map((t) => (
            <span key={t} className="rounded-full border border-border bg-background px-2.5 py-1">{t}</span>
          ))}
        </div>
      </label>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Try the demo:&nbsp;
        <button
          onClick={async () => {
            const res = await fetch("https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200");
            const blob = await res.blob();
            onFile(new File([blob], "demo.jpg", { type: blob.type }));
          }}
          className="font-semibold text-primary hover:underline"
        >
          load sample factory image
        </button>
      </div>
    </div>
  );
}

function HazardDetail({
  hazard, showExplain, onExplain,
}: { hazard: Hazard; showExplain: boolean; onExplain: () => void }) {
  const score = riskScore(hazard);
  const lvl = riskFromScore(score);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{hazard.category}</div>
          <h3 className="mt-0.5 text-lg font-bold text-foreground">{hazard.label}</h3>
        </div>
        <RiskBadge level={lvl} />
      </div>

      {/* Risk matrix */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
        <Stat label="Severity" value={`${hazard.severity}/5`} />
        <Stat label="Likelihood" value={`${hazard.likelihood}/5`} />
        <Stat label="Risk score" value={String(score)} highlight />
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Corrective action</div>
          <p className="text-foreground">{hazard.correctiveAction}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Owner:</strong> {hazard.owner}</span>
          <span><strong className="text-foreground">Due:</strong> {hazard.dueInDays}d</span>
        </div>
      </div>

      {!showExplain ? (
        <button
          onClick={onExplain}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          <MessageSquare className="h-4 w-4" /> Ask EHSS Assistant to explain
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" /> {hazard.ehssRef}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{hazard.ehssText}</p>
          <div className="mt-3 border-t border-primary/15 pt-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preventive action</div>
            <p className="text-foreground">{hazard.preventiveAction}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
