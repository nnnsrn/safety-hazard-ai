// EHSS SafetyVision — real object detection
// ---------------------------------------------------------------
// Uses TensorFlow.js COCO-SSD in the browser for REAL object
// detection — no simulated / random boxes. Only objects that are
// actually visible in the frame (with confidence >= threshold)
// are drawn.
//
// The 7-class EHSS taxonomy is:
//   person, helmet, safety_vest, wet_floor,
//   blocked_walkway, exposed_cable, chemical_spill
//
// COCO-SSD natively detects `person` and many common objects.
// For the EHSS-specific classes (helmet, vest, wet_floor, spill,
// exposed_cable, blocked_walkway) a purpose-trained YOLOv11 model
// is required — see /training/README.md and train.py. Once
// best.pt is exported to TFJS and dropped in
// public/models/safetyvision7/, swap `loadModel()` below to load
// it via tf.loadGraphModel and replace the `detect()` body with
// the YOLO post-processing (NMS + class map). The UI, alerting,
// and reporting layers already understand all 7 classes.
//
// Until that model is deployed, we ONLY show what COCO-SSD is
// truly confident about (>= 0.6). Nothing is fabricated: if an
// object isn't on screen, no box is drawn.

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
  person: "#E60012",
  helmet: "#F59E0B",
  safety_vest: "#10B981",
  wet_floor: "#3B82F6",
  blocked_walkway: "#8B5CF6",
  exposed_cable: "#EF4444",
  chemical_spill: "#EC4899",
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

// Extra COCO classes we surface as generic-object detections so
// operators still see real bounding boxes on non-EHSS items in the
// scene (useful for context / walkway obstruction hints). These
// are NOT mapped to hazards — they render with a neutral color and
// their real COCO label.
const COCO_CONTEXT_COLOR = "#0EA5E9";

// Confidence threshold — anything below is ignored.
const SCORE_THRESHOLD = 0.6;

export type Detection = {
  class: EhssClass | string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h in pixels
  isHazard?: boolean;
};

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      // mobilenet_v2 is a bit slower than lite_mobilenet_v2 but
      // materially more accurate — worth it for a safety tool.
      return cocoSsd.load({ base: "mobilenet_v2" });
    })();
  }
  return modelPromise;
}

export async function detect(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const model = await loadModel();
  const raw = await model.detect(source as HTMLImageElement, 20, SCORE_THRESHOLD);

  return raw
    .filter((r) => r.score >= SCORE_THRESHOLD)
    .map<Detection>((r) => ({
      class: r.class === "person" ? "person" : r.class,
      score: r.score,
      bbox: r.bbox as [number, number, number, number],
    }));
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

export { COCO_CONTEXT_COLOR };
