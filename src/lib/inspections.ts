import { supabase } from "@/integrations/supabase/client";
import type { ScoreResult, HazardCategory } from "./safety-data";
import { correctiveActionFor } from "./safety-data";
import type { Detection } from "./detection";

export type InspectionRow = {
  id: string;
  inspector_id: string;
  inspector_name: string;
  inspector_email: string;
  area: string;
  source: string;
  category: HazardCategory;
  status: string;
  risk_score: number;
  severity: string;
  detected_objects: Detection[];
  missing_ppe: string[];
  env_hazards: string[];
  corrective_action: string | null;
  image_data_url: string | null;
  notes: string | null;
  created_at: string;
};

export async function saveInspection(input: {
  inspectorId: string;
  inspectorName: string;
  inspectorEmail: string;
  area: string;
  source: "upload" | "camera" | "live";
  result: ScoreResult;
  detections: Detection[];
  imageDataUrl?: string | null;
  notes?: string;
}): Promise<InspectionRow | null> {
  const { result } = input;
  const { data, error } = await supabase
    .from("inspections")
    .insert({
      inspector_id: input.inspectorId,
      inspector_name: input.inspectorName,
      inspector_email: input.inspectorEmail,
      area: input.area,
      source: input.source,
      category: result.category,
      status: result.status,
      risk_score: result.score,
      severity: result.severity,
      detected_objects: input.detections as unknown as object,
      missing_ppe: result.missingPpe,
      env_hazards: result.envHazards,
      corrective_action: correctiveActionFor(result),
      image_data_url: input.imageDataUrl ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("saveInspection error", error);
    return null;
  }
  return data as unknown as InspectionRow;
}

export async function listInspections(limit = 200): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from("inspections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listInspections error", error);
    return [];
  }
  return (data ?? []) as unknown as InspectionRow[];
}
