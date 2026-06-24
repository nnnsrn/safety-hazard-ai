import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2, Aperture } from "lucide-react";
import { detect, loadModel, type Detection } from "@/lib/detection";

type Props = {
  onCapture: (dataUrl: string, lastDetections: Detection[]) => void;
};

export function LiveCamera({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastDetsRef = useRef<Detection[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  async function start() {
    setStatus("loading");
    setErr(null);
    try {
      await loadModel(); // warm up
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setStatus("running");
      runLoop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera failed";
      setErr(msg);
      setStatus("error");
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }

  async function runLoop() {
    const v = videoRef.current;
    const c = overlayRef.current;
    if (!v || !c) return;
    let frames = 0;
    let t0 = performance.now();

    const tick = async () => {
      if (!streamRef.current) return;
      try {
        const dets = await detect(v);
        lastDetsRef.current = dets;
        drawOverlay(c, v, dets);
      } catch {
        // swallow per-frame errors
      }
      frames++;
      const now = performance.now();
      if (now - t0 > 1000) {
        setFps(Math.round((frames * 1000) / (now - t0)));
        frames = 0;
        t0 = now;
      }
      rafRef.current = requestAnimationFrame(() => void tick());
    };
    void tick();
  }

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0);
    // overlay boxes onto snapshot
    drawOverlay(canvas, v, lastDetsRef.current, true);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(dataUrl, lastDetsRef.current);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="relative aspect-video w-full bg-black">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {status !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
            {status === "loading" && <Loader2 className="h-8 w-8 animate-spin" />}
            {status === "error" && <CameraOff className="h-8 w-8 text-red-400" />}
            {status === "idle" && <Camera className="h-8 w-8" />}
            <div className="text-sm font-medium">
              {status === "loading" && "Loading detection model…"}
              {status === "error" && (err ?? "Camera unavailable")}
              {status === "idle" && "Camera off"}
            </div>
            {(status === "idle" || status === "error") && (
              <button
                onClick={start}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Start camera
              </button>
            )}
          </div>
        )}

        {status === "running" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE · {fps} fps · {lastDetsRef.current.length} objects
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <div className="text-xs text-muted-foreground">
          Real-time detection runs entirely in your browser (TensorFlow.js).
        </div>
        <div className="flex gap-2">
          {status === "running" && (
            <>
              <button
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <CameraOff className="h-4 w-4" /> Stop
              </button>
              <button
                onClick={capture}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Aperture className="h-4 w-4" /> Capture & Analyze
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  source: HTMLVideoElement,
  dets: Detection[],
  preserveSize = false,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (!preserveSize) {
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
  }
  if (!preserveSize) ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const d of dets) {
    const [x, y, w, h] = d.bbox;
    const isPerson = d.class === "person";
    const color = isPerson ? "#E60012" : "#0EA5E9";
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);

    const label = `${d.class} ${Math.round(d.score * 100)}%`;
    ctx.font = "bold 14px system-ui";
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = color;
    ctx.fillRect(x, Math.max(0, y - 22), tw, 22);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 5, Math.max(14, y - 6));
  }
}
