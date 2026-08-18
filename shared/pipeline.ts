export const PIPELINE_STAGES = [
  { key: "business", label: "Business" },
  { key: "audit", label: "Audit" },
  { key: "problems", label: "Problems" },
  { key: "opportunities", label: "Opportunities" },
  { key: "strategy", label: "Strategy" },
  { key: "brand", label: "Brand DNA" },
  { key: "sitemap", label: "Sitemap" },
  { key: "design_system", label: "Design System" },
  { key: "pages", label: "Pages" },
  { key: "content", label: "Content" },
  { key: "design_brief", label: "Design Brief" },
  { key: "stitch_prompts", label: "Stitch Prompts" },
  { key: "build_spec", label: "Handoff" },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["key"];
export type DataOrigin = "real_data" | "demo_data" | "ai_inference" | "missing_data" | "user_provided_data";
export type WebsiteStatus = "no_website" | "website_exists" | "website_unavailable" | "website_unknown";

export const DATA_ORIGIN_LABELS: Record<DataOrigin, string> = {
  real_data: "REAL DATA",
  demo_data: "DEMO DATA",
  ai_inference: "AI INFERENCE",
  missing_data: "MISSING DATA",
  user_provided_data: "USER PROVIDED DATA",
};

export const artifactToStage: Record<string, PipelineStage> = {
  audit: "audit",
  problems: "problems",
  opportunities: "opportunities",
  strategy: "strategy",
  brand_dna: "brand",
  design_system: "design_system",
  sitemap: "sitemap",
  page_specifications: "pages",
  content: "content",
  design_brief: "design_brief",
  stitch_prompts: "stitch_prompts",
  build_specification: "build_spec",
};

export function nextArtifactVersion(currentVersion: number | null | undefined) {
  return (currentVersion ?? 0) + 1;
}
