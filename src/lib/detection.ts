// TensorFlow.js COCO-SSD wrapper for in-browser, real-time object detection.
// Detects: person + general objects. PPE compliance is reviewed by the
// inspector via a quick checklist (COCO has no PPE classes).

import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

export type Detection = {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // x, y, w, h in pixels
};

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      // 'lite_mobilenet_v2' is the fastest base; ~12-20fps on a laptop.
      return cocoSsd.load({ base: "lite_mobilenet_v2" });
    })();
  }
  return modelPromise;
}

export async function detect(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Detection[]> {
  const model = await loadModel();
  const raw = await model.detect(source as HTMLImageElement);
  return raw.map((r) => ({ class: r.class, score: r.score, bbox: r.bbox as [number, number, number, number] }));
}

/** Categorize raw COCO detections into the buckets the UI cares about. */
export type DetectionSummary = {
  people: number;
  objects: Detection[]; // anything non-person
  hazardHints: { class: string; mapped: string }[];
};

// Loose heuristic: a few COCO labels can hint at environmental hazards.
const HAZARD_HINTS: Record<string, string> = {
  "fire hydrant": "fire",
  "bottle": "spill",
  "cell phone": "distraction",
  "knife": "sharp_object",
};

export function summarize(dets: Detection[]): DetectionSummary {
  const people = dets.filter((d) => d.class === "person").length;
  const objects = dets.filter((d) => d.class !== "person");
  const hazardHints = objects
    .filter((o) => HAZARD_HINTS[o.class])
    .map((o) => ({ class: o.class, mapped: HAZARD_HINTS[o.class] }));
  return { people, objects, hazardHints };
}
