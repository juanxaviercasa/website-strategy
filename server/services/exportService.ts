import { storagePut } from "../storage";
import { createExportRecord } from "../db";

export type ExportFormat = "json" | "markdown" | "pdf";
export type ExportableArtifact = {
  auditId: number;
  auditPublicId: string;
  ownerId: number;
  businessName: string;
  artifactType: "design_system" | "content" | "build_specification";
  title: string;
  summary: string | null;
  payload: Record<string, unknown>;
  provider: string;
  dataOrigin: string;
};

function slug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "artifact";
}

function markdown(input: ExportableArtifact) {
  return `# ${input.title}\n\n> **Business:** ${input.businessName}  \n> **Pipeline:** ${input.auditPublicId}  \n> **Provider:** ${input.provider}  \n> **Data origin:** ${input.dataOrigin.replace("_", " ")}\n\n${input.summary ?? ""}\n\n## Artifact data\n\n\`\`\`json\n${JSON.stringify(input.payload, null, 2)}\n\`\`\`\n\n---\n\nThis export may contain proposed directions, DEMO data or AI inference. Validate business facts, copy and legal claims before external use.\n`;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function simplePdf(text: string): Buffer {
  const sourceLines = text.replace(/\r/g, "").split("\n").flatMap(line => line.match(/.{1,88}(?:\s|$)|.{1,88}/g) ?? [line]).slice(0, 46);
  const stream = ["BT", "/F1 10 Tf", "50 780 Td", "14 TL", ...sourceLines.flatMap((line, index) => [`(${pdfEscape(line.trim())}) Tj`, ...(index === sourceLines.length - 1 ? [] : ["T*"])]), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output, "utf8")); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "utf8");
}

export async function createArtifactExport(input: ExportableArtifact, format: ExportFormat) {
  const contentMarkdown = markdown(input);
  const base = `${slug(input.businessName)}-${input.artifactType}-v1`;
  const output = format === "json"
    ? { content: JSON.stringify({ title: input.title, audit_id: input.auditPublicId, business: input.businessName, provider: input.provider, data_origin: input.dataOrigin, summary: input.summary, payload: input.payload, disclaimer: "Validate all recommendations and factual claims before external use." }, null, 2), contentType: "application/json", extension: "json" }
    : format === "markdown"
      ? { content: contentMarkdown, contentType: "text/markdown; charset=utf-8", extension: "md" }
      : { content: simplePdf(contentMarkdown), contentType: "application/pdf", extension: "pdf" };
  const fileName = `${base}.${output.extension}`;
  const stored = await storagePut(`strategy-engine/${input.ownerId}/${input.auditPublicId}/${fileName}`, output.content, output.contentType);
  return createExportRecord({ ownerId: input.ownerId, auditId: input.auditId, artifactType: input.artifactType, format, fileName, storageKey: stored.key, storageUrl: stored.url });
}
