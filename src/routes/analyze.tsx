import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Upload, Sparkles, FileText, RotateCcw, Camera, ImageIcon,
  CheckCircle2, AlertTriangle, ShieldAlert, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LiveCamera } from "@/components/LiveCamera";
import { useAuth } from "@/lib/auth";
import {
  PPE_LABEL, ENV_LABEL, CATEGORIES, classify, correctiveActionFor,
  type PpeKey, type EnvHazardKey,
} from "@/lib/safety-data";
import { loadModel, detect, type Detection } from "@/lib/detection";
import { saveInspection, type InspectionRow } from "@/lib/inspections";
import { notifyInspectionComplete } from "@/lib/notifications";
import { exportInspectionPdf } from "@/lib/exporters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Hazard Analyzer — Mattel EHSS SafetyVision" },
      { name: "description", content: "Live AI hazard detection — camera, upload, or drag & drop." },
    ],
  }),
  component: AnalyzePage,
});

type Mode = "choose" | "live" | "upload";
type Stage = "idle" | "running" | "review";

function AnalyzePage() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [stage, setStage] = useState<Stage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [area, setArea] = useState("Production Line A");
  const [missingPpe, setMissingPpe] = useState<PpeKey[]>([]);
  const [envHazards, setEnvHazards] = useState<EnvHazardKey[]>([]);
  const [saved, setSaved] = useState<InspectionRow | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStage("idle");
    setImageUrl(null);
    setDetections([]);
    setMissingPpe([]);
    setEnvHazards([]);
    setSaved(null);
    setMode("choose");
  }

  async function analyzeImage(dataUrl: string, detsFromLive?: Detection[]) {
    setImageUrl(dataUrl);
    setStage("running");
    if (detsFromLive) {
      setDetections(detsFromLive);
      setStage("review");
      return;
    }
    // Run COCO-SSD on the uploaded image
    await loadModel();
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    try {
      const dets = await detect(img);
      setDetections(dets);
    } catch (e) {
      console.error(e);
      setDetections([]);
    }
    setStage("review");
  }

  async function onSubmit() {
    if (!user || !profile) return;
    setBusy(true);
    const result = classify(missingPpe, envHazards);
    const row = await saveInspection({
      inspectorId: user.id,
      inspectorName: profile.full_name,
      inspectorEmail: profile.email,
      area,
      source: mode === "live" ? "live" : "upload",
      result,
      detections,
      imageDataUrl: imageUrl,
    });
    setBusy(false);
    if (row) {
      setSaved(row);
      notifyInspectionComplete({
        inspectionId: row.id.slice(0, 8).toUpperCase(),
        inspector: profile.full_name,
        area,
        result,
        timestamp: new Date(row.created_at),
      });
    }
  }

  const liveResult = stage === "review" ? classify(missingPpe, envHazards) : null;

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">AI Hazard Analyzer</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Detect hazards in real time</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live camera or image upload · On-device object detection · 5-category risk scoring
          </p>
        </div>
        {(stage === "review" || saved) && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> New inspection
          </button>
        )}
      </header>

      {saved ? (
        <SavedSummary row={saved} onNew={reset} />
      ) : stage === "review" && imageUrl && liveResult ? (
        <ReviewScreen
          imageUrl={imageUrl}
          detections={detections}
          area={area}
          setArea={setArea}
          missingPpe={missingPpe}
          setMissingPpe={setMissingPpe}
          envHazards={envHazards}
          setEnvHazards={setEnvHazards}
          result={liveResult}
          busy={busy}
          onSubmit={onSubmit}
        />
      ) : mode === "choose" ? (
        <ModePicker onPick={setMode} />
      ) : mode === "live" ? (
        <LiveCamera
          onCapture={(dataUrl, dets) => {
            void analyzeImage(dataUrl, dets);
          }}
        />
      ) : (
        <UploadZone onFile={(dataUrl) => void analyzeImage(dataUrl)} running={stage === "running"} />
      )}
    </AppShell>
  );
}

function ModePicker({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        onClick={() => onPick("live")}
        className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Camera className="h-6 w-6" />
        </div>
        <div>
          <div className="text-base font-semibold">Live camera detection</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Stream your camera with continuous on-device object detection. Capture a frame to file an inspection.
          </p>
        </div>
        <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-primary group-hover:underline">
          Start camera →
        </span>
      </button>
      <button
        onClick={() => onPick("upload")}
        className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-base font-semibold">Upload or drag &amp; drop</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Drop a photo from a phone, dashcam, or CCTV still. Same detection pipeline, same scoring.
          </p>
        </div>
        <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-primary group-hover:underline">
          Choose image →
        </span>
      </button>
    </div>
  );
}

function UploadZone({ onFile, running }: { onFile: (dataUrl: string) => void; running: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handle = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (running) {
    return (
      <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <div className="mt-4 text-base font-semibold">Running detection…</div>
        <p className="mt-1 text-sm text-muted-foreground">First run loads the ~6 MB model; subsequent runs are instant.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handle(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-16 text-center transition",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-7 w-7" />
        </div>
        <div className="mt-4 text-base font-semibold">Drop an image or click to upload</div>
        <div className="mt-1 text-sm text-muted-foreground">JPG, PNG up to 10 MB</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
        />
      </div>
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Try the demo:&nbsp;
        <button
          onClick={async () => {
            const res = await fetch("https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200");
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onload = () => onFile(reader.result as string);
            reader.readAsDataURL(blob);
          }}
          className="font-semibold text-primary hover:underline"
        >
          load sample factory image
        </button>
      </div>
    </div>
  );
}

function ReviewScreen(props: {
  imageUrl: string;
  detections: Detection[];
  area: string;
  setArea: (v: string) => void;
  missingPpe: PpeKey[];
  setMissingPpe: (v: PpeKey[]) => void;
  envHazards: EnvHazardKey[];
  setEnvHazards: (v: EnvHazardKey[]) => void;
  result: ReturnType<typeof classify>;
  busy: boolean;
  onSubmit: () => void;
}) {
  const { imageUrl, detections, area, setArea, missingPpe, setMissingPpe,
    envHazards, setEnvHazards, result, busy, onSubmit } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    const cvs = canvasRef.current;
    if (!img || !cvs) return;
    const draw = () => {
      cvs.width = img.naturalWidth;
      cvs.height = img.naturalHeight;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      for (const d of detections) {
        const [x, y, w, h] = d.bbox;
        const isPerson = d.class === "person";
        const color = isPerson ? "#E60012" : "#0EA5E9";
        ctx.lineWidth = Math.max(2, cvs.width / 400);
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, w, h);
        ctx.font = `bold ${Math.max(12, cvs.width / 70)}px system-ui`;
        const label = `${d.class} ${Math.round(d.score * 100)}%`;
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 5, Math.max(14, y - 6));
      }
    };
    if (img.complete) draw();
    else img.onload = draw;
  }, [imageUrl, detections]);

  const def = CATEGORIES[result.category];
  const peopleCount = detections.filter((d) => d.class === "person").length;

  function toggle<T extends string>(arr: T[], setArr: (v: T[]) => void, k: T) {
    setArr(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="relative bg-black/5">
            <img ref={imgRef} src={imageUrl} alt="" className="block w-full" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>{detections.length} objects · {peopleCount} {peopleCount === 1 ? "person" : "people"}</span>
            <span className="font-mono">on-device · COCO-SSD</span>
          </div>
        </div>

        {/* Big risk banner */}
        <div
          className={cn(
            "mt-4 flex items-center gap-4 rounded-xl border p-4 shadow-sm",
            def.badgeClass,
          )}
        >
          {result.category === 1 ? (
            <CheckCircle2 className="h-9 w-9" />
          ) : result.category >= 4 ? (
            <ShieldAlert className="h-9 w-9" />
          ) : (
            <AlertTriangle className="h-9 w-9" />
          )}
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">
              Category {result.category} · {result.severity}
            </div>
            <div className="text-xl font-bold">{def.status}</div>
            <div className="text-sm opacity-90">{def.description}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Risk score</div>
            <div className="text-3xl font-black tabular-nums">{result.score}</div>
            <div className="text-[10px] opacity-70">/ 100</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Area / Location
          </label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider">
            PPE compliance ({peopleCount > 0 ? `${peopleCount} worker${peopleCount > 1 ? "s" : ""} detected` : "no person detected"})
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {(Object.keys(PPE_LABEL) as PpeKey[]).map((k) => {
              const active = missingPpe.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => toggle(missingPpe, setMissingPpe, k)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-risk-high bg-risk-high/10 text-risk-high"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    {active ? "Missing" : "Present"}
                  </div>
                  <div className="font-medium">{PPE_LABEL[k]}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider">
            Environmental hazards
          </div>
          <div className="flex flex-wrap gap-2 p-3">
            {(Object.keys(ENV_LABEL) as EnvHazardKey[]).map((k) => {
              const active = envHazards.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => toggle(envHazards, setEnvHazards, k)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-risk-critical bg-risk-critical/10 text-risk-critical"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  {ENV_LABEL[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended action
          </div>
          <p>{correctiveActionFor(result)}</p>
        </div>

        <button
          onClick={onSubmit}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Filing inspection…" : "File inspection & notify"}
        </button>
      </div>
    </div>
  );
}

function SavedSummary({ row, onNew }: { row: InspectionRow; onNew: () => void }) {
  const def = CATEGORIES[row.category];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className={cn("lg:col-span-2 rounded-xl border p-6 shadow-sm", def.badgeClass)}>
        <div className="flex items-start gap-4">
          <CheckCircle2 className="h-10 w-10 shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-80">Inspection filed</div>
            <h2 className="mt-1 text-2xl font-bold">{def.status}</h2>
            <p className="text-sm opacity-90">{row.corrective_action}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <Stat label="Category" value={`${row.category}`} />
              <Stat label="Score" value={`${row.risk_score}/100`} />
              <Stat label="ID" value={row.id.slice(0, 8).toUpperCase()} />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => exportInspectionPdf(row)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90"
        >
          <FileText className="h-4 w-4" /> Download PDF report
        </button>
        <Link
          to="/reports"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent"
        >
          View all reports
        </Link>
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent"
        >
          <RotateCcw className="h-4 w-4" /> New inspection
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
