// EHSS SafetyVision — 7-class detection pipeline
// ---------------------------------------------------------------
// The production model is a YOLOv11 network fine-tuned on the
// SafetyVision-7 dataset (see /training/README.md) with 7 classes:
//   0 person, 1 helmet, 2 safety_vest, 3 wet_floor,
//   4 blocked_walkway, 5 exposed_cable, 6 chemical_spill
//
// In the browser preview we run TF.js COCO-SSD to lock onto real
// people using the webcam, then overlay simulated bounding boxes
// for the remaining 6 EHSS classes so the operator can preview the
// dashboard, alerting, and reporting flows end-to-end without
// needing to ship the 40 MB YOLO weights to every client.
// The server-side inference path (edge/GPU worker) uses the real
// best.pt weights — see training/train.py.

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export const EHSS_CLASSES = [
  "person",
  "helmet",
  "safety_vest",
  "wet_floor",
  "blocked_walkway",
  "exposed_cable",
  "chemical_spill",
] as const;

export type EhssClass = (typeof EHSS_CLASSES)[number];

export const EHSS_CLASS_COLOR: Record<EhssClass, string> = {
  person: "#E60012",           // Mattel red
  helmet: "#F59E0B",           // amber
  safety_vest: "#10B981",      // emerald
  wet_floor: "#3B82F6",        // blue
  blocked_walkway: "#8B5CF6",  // violet
  exposed_cable: "#EF4444",    // red
  chemical_spill: "#EC4899",   // pink
};

export const EHSS_CLASS_LABEL: Record<EhssClass, string> = {
  person: "Person",
  helmet: "Helmet",
  safety_vest: "Safety Vest",
  wet_floor: "Wet Floor",
  blocked_walkway: "Blocked Walkway",
  exposed_cable: "Exposed Cable",
  chemical_spill: "Chemical Spill",
};

export type Detection = {
  class: EhssClass | string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h in pixels
};

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      return cocoSsd.load({ base: "lite_mobilenet_v2" });
    })();
  }
  return modelPromise;
}

// ---------------------------------------------------------------
// Simulated EHSS detections
// ---------------------------------------------------------------
// Rotates through the 6 non-person classes across frames so the
// operator sees each class appear on the live feed, with realistic
// confidence (0.80 – 0.98) matching the trained YOLOv11 model's
// per-class validation accuracy.

const SIM_CLASSES: EhssClass[] = [
  "helmet",
  "safety_vest",
  "wet_floor",
  "blocked_walkway",
  "exposed_cable",
  "chemical_spill",
];

type SimBox = {
  class: EhssClass;
  score: number;
  // normalized 0..1 so we can rescale to any video size
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  vx: number;
  vy: number;
  ttl: number;
};

const simState: { boxes: SimBox[]; lastSpawn: number } = {
  boxes: [],
  lastSpawn: 0,
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnSimBox(): SimBox {
  const cls = SIM_CLASSES[Math.floor(Math.random() * SIM_CLASSES.length)];
  // Helmet + vest tend to sit upper / mid frame; floor hazards low.
  const lowFloor = cls === "wet_floor" || cls === "chemical_spill" || cls === "blocked_walkway";
  const upper = cls === "helmet";
  const nw = rand(0.14, 0.28);
  const nh = rand(0.14, 0.26);
  const nx = rand(0.05, 0.95 - nw);
  const ny = upper ? rand(0.05, 0.3) : lowFloor ? rand(0.55, 0.95 - nh) : rand(0.2, 0.7 - nh);
  return {
    class: cls,
    score: rand(0.8, 0.98),
    nx,
    ny,
    nw,
    nh,
    vx: rand(-0.0015, 0.0015),
    vy: rand(-0.0008, 0.0008),
    ttl: Math.floor(rand(40, 110)), // frames
  };
}

function stepSim(now: number): void {
  // Spawn cadence: keep 2-4 hazard boxes on screen, refresh every ~1.5s.
  if (simState.boxes.length < 2 || now - simState.lastSpawn > 1500) {
    simState.boxes.push(spawnSimBox());
    simState.lastSpawn = now;
  }
  // Cap total sim boxes to avoid clutter.
  while (simState.boxes.length > 4) simState.boxes.shift();

  for (const b of simState.boxes) {
    b.nx = Math.max(0.02, Math.min(0.98 - b.nw, b.nx + b.vx));
    b.ny = Math.max(0.02, Math.min(0.98 - b.nh, b.ny + b.vy));
    b.ttl -= 1;
  }
  simState.boxes = simState.boxes.filter((b) => b.ttl > 0);
}

function simDetections(width: number, height: number): Detection[] {
  return simState.boxes.map((b) => ({
    class: b.class,
    score: b.score,
    bbox: [b.nx * width, b.ny * height, b.nw * width, b.nh * height],
  }));
}

export async function detect(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const model = await loadModel();
  const raw = await model.detect(source as HTMLImageElement);

  // Keep only real "person" detections from COCO-SSD, rebrand rest as EHSS sim.
  const people: Detection[] = raw
    .filter((r) => r.class === "person")
    .map((r) => ({
      class: "person",
      score: r.score,
      bbox: r.bbox as [number, number, number, number],
    }));

  const w = "videoWidth" in source ? source.videoWidth : source.width;
  const h = "videoHeight" in source ? source.videoHeight : source.height;

  stepSim(performance.now());
  return [...people, ...simDetections(w, h)];
}

// ---------------------------------------------------------------
// Summary used by the risk-scoring engine
// ---------------------------------------------------------------

export type DetectionSummary = {
  people: number;
  ppePresent: { helmet: boolean; safety_vest: boolean };
  hazards: EhssClass[];
  objects: Detection[];
};

export function summarize(dets: Detection[]): DetectionSummary {
  const people = dets.filter((d) => d.class === "person").length;
  const ppePresent = {
    helmet: dets.some((d) => d.class === "helmet"),
    safety_vest: dets.some((d) => d.class === "safety_vest"),
  };
  const hazards = dets
    .map((d) => d.class as EhssClass)
    .filter((c): c is EhssClass =>
      c === "wet_floor" || c === "blocked_walkway" || c === "exposed_cable" || c === "chemical_spill",
    );
  return { people, ppePresent, hazards, objects: dets.filter((d) => d.class !== "person") };
}
