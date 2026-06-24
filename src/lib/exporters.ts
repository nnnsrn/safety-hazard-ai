import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { InspectionRow } from "./inspections";
import { PPE_LABEL, ENV_LABEL, type PpeKey, type EnvHazardKey } from "./safety-data";

function fmt(date: string) {
  return new Date(date).toLocaleString();
}

function ppeText(ids: string[]) {
  return ids.length ? ids.map((k) => PPE_LABEL[k as PpeKey] ?? k).join(", ") : "—";
}
function envText(ids: string[]) {
  return ids.length ? ids.map((k) => ENV_LABEL[k as EnvHazardKey] ?? k).join(", ") : "—";
}

export function exportInspectionPdf(r: InspectionRow) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(230, 0, 18);
  doc.rect(0, 0, W, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MATTEL · EHSS SafetyVision", 40, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Safety Inspection Report", 40, 42);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);

  autoTable(doc, {
    startY: 80,
    head: [["Field", "Value"]],
    body: [
      ["Inspection ID", r.id.slice(0, 8).toUpperCase()],
      ["Date", fmt(r.created_at)],
      ["Inspector", `${r.inspector_name} (${r.inspector_email})`],
      ["Area / Location", r.area],
      ["Source", r.source.toUpperCase()],
      ["Status", r.status],
      ["Category", `Category ${r.category} (${r.severity})`],
      ["Risk Score", `${r.risk_score} / 100`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 10 },
  });

  // Findings
  autoTable(doc, {
    head: [["Findings", "Details"]],
    body: [
      ["Missing PPE", ppeText(r.missing_ppe)],
      ["Environmental Hazards", envText(r.env_hazards)],
      ["Objects detected", String((r.detected_objects ?? []).length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [230, 0, 18] },
    styles: { fontSize: 10 },
  });

  // Corrective action
  const yAfter = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Corrective Action", 40, yAfter);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const split = doc.splitTextToSize(r.corrective_action ?? "—", W - 80);
  doc.text(split, 40, yAfter + 16);

  // Image
  if (r.image_data_url) {
    try {
      const imgY = yAfter + 16 + split.length * 12 + 12;
      doc.addImage(r.image_data_url, "JPEG", 40, imgY, 240, 160);
    } catch {}
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "Mattel EHSS SafetyVision · This report was generated automatically from AI-assisted inspection data.",
    40,
    doc.internal.pageSize.getHeight() - 24,
  );

  doc.save(`inspection-${r.id.slice(0, 8)}.pdf`);
}

export function exportInspectionsXlsx(rows: InspectionRow[]) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      "Inspection ID": r.id.slice(0, 8).toUpperCase(),
      Date: fmt(r.created_at),
      Inspector: r.inspector_name,
      Email: r.inspector_email,
      Area: r.area,
      Source: r.source.toUpperCase(),
      Status: r.status,
      Category: r.category,
      Severity: r.severity,
      "Risk Score": r.risk_score,
      "Missing PPE": ppeText(r.missing_ppe),
      "Env Hazards": envText(r.env_hazards),
      "Corrective Action": r.corrective_action ?? "",
      Notes: r.notes ?? "",
    })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inspections");
  XLSX.writeFile(wb, `ehss-inspections-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
