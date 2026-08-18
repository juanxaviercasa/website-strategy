import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ storagePut: vi.fn(), createExportRecord: vi.fn(), listLLMModels: vi.fn(), invokeLLM: vi.fn(), createAudit: vi.fn(), completeAudit: vi.fn(), getBusiness: vi.fn(), recordIntegrationSync: vi.fn(), saveArtifact: vi.fn(), updateStage: vi.fn(), notifyOwner: vi.fn() }));

vi.mock("../server/storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("../server/db", () => ({ createExportRecord: mocks.createExportRecord, createAudit: mocks.createAudit, completeAudit: mocks.completeAudit, getBusiness: mocks.getBusiness, recordIntegrationSync: mocks.recordIntegrationSync, saveArtifact: mocks.saveArtifact, updateStage: mocks.updateStage }));
vi.mock("../server/_core/llm", () => ({ listLLMModels: mocks.listLLMModels, invokeLLM: mocks.invokeLLM }));
vi.mock("../server/_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));

import { normalizeWebApp1Dossier, normalizeWebApp1Export } from "./contracts/webApp1";
import { DemoDigitalAuditProvider } from "./providers/digitalAudit";
import { DemoWebApp1Provider } from "./providers/leadSource";
import { getPipelineResultSink } from "./providers/resultSink";
import { buildDemoPipeline } from "./services/demoPipeline";
import { createArtifactExport } from "./services/exportService";
import { generateArtifactWithLLM } from "./providers/llmArtifactProvider";
import { nextArtifactVersion } from "../shared/pipeline";
import { runDemoPipeline } from "./services/pipelineService";

describe("Web App 1 inbound contract", () => {
  it("normalizes the export contract without losing lead_id or origin", () => {
    const lead = normalizeWebApp1Export({
      lead_id: "LEAD-EXAMPLE-001",
      business_name: "Example Local Business",
      website_status: "no_website",
      opportunity_score: 91,
      source: "web_app_1",
    }, "demo_data");
    expect(lead).toMatchObject({ leadId: "LEAD-EXAMPLE-001", websiteStatus: "no_website", opportunityScore: 91, dataOrigin: "demo_data" });
  });

  it("normalizes the dossier contract into a stable lead identifier", () => {
    const lead = normalizeWebApp1Dossier({
      deliveryId: "delivery-42",
      dossier: {
        business: { name: "Dossier Business", city: "Lima", country: "Perú", websiteStatus: "website_found" },
        opportunity: { id: 42, opportunityScore: 75, priority: "p1", opportunityTypes: ["conversion_redesign"] },
      },
    });
    expect(lead).toMatchObject({ leadId: "lead_42", sourceReference: "delivery-42", location: "Lima, Perú", websiteStatus: "website_exists" });
  });
});

describe("free-first DEMO pipeline", () => {
  it("imports DEMO businesses and creates all required strategic artifacts", async () => {
    const source = new DemoWebApp1Provider();
    const imported = await source.importLeads();
    expect(imported.mode).toBe("demo");
    expect(imported.records).toHaveLength(3);
    const audit = await new DemoDigitalAuditProvider().analyze(imported.records[0]!);
    const artifacts = buildDemoPipeline(imported.records[0]!, audit);
    expect(audit.dataOrigin).toBe("demo_data");
    expect(audit.problems).toHaveLength(3);
    expect(artifacts.map(item => item.artifactType)).toEqual([
      "audit", "problems", "opportunities", "strategy", "brand_dna", "design_system", "sitemap", "page_specifications", "content", "design_brief", "stitch_prompts", "build_specification",
    ]);
    expect(artifacts.find(item => item.artifactType === "design_system")?.payload).toHaveProperty("colors.ink", "#18344A");
    expect(artifacts.find(item => item.artifactType === "stitch_prompts")?.payload).toHaveProperty("masterPrompt");
  });

  it("prepares an outbound placeholder without making an external delivery", async () => {
    const delivery = await getPipelineResultSink().prepare({
      version: "1.0", event: "strategy.pipeline.completed", auditId: "AUD-DEMO-1", leadId: "LEAD-DEMO-1", status: "completed", generatedAt: "2026-08-18T00:00:00.000Z", artifacts: [{ type: "strategy", version: 1, title: "Website strategy" }], note: "Validate before external use.",
    });
    expect(delivery.status).toBe("placeholder");
    expect(delivery.note).toContain("No se realizó ninguna llamada externa");
    expect(delivery.envelope.leadId).toBe("LEAD-DEMO-1");
  });
});

describe("artifact exports", () => {
  beforeEach(() => {
    mocks.storagePut.mockReset();
    mocks.createExportRecord.mockReset();
    mocks.storagePut.mockResolvedValue({ key: "strategy-engine/1/AUD-1/test.pdf", url: "/manus-storage/strategy-engine/1/AUD-1/test.pdf" });
    mocks.createExportRecord.mockImplementation(async (input: unknown) => input);
  });

  it("renders a PDF and records an S3 export without persisting file bytes to the database", async () => {
    const result = await createArtifactExport({
      auditId: 1, auditPublicId: "AUD-1", ownerId: 1, businessName: "Example Business", artifactType: "build_specification", title: "Website build specification", summary: "Build-ready handoff", payload: { pages: ["Home", "Contact"] }, provider: "demo_pipeline_generator", dataOrigin: "demo_data",
    }, "pdf");
    expect(mocks.storagePut).toHaveBeenCalledOnce();
    const [, bytes, contentType] = mocks.storagePut.mock.calls[0]!;
    expect(contentType).toBe("application/pdf");
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect((bytes as Buffer).subarray(0, 4).toString()).toBe("%PDF");
    expect(mocks.createExportRecord).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf", storageKey: expect.any(String), storageUrl: expect.stringContaining("/manus-storage/") }));
    expect(result).toHaveProperty("fileName");
  });
});

describe("optional LLM enhancement", () => {
  it("uses an available low-cost model for strict structured output while DEMO remains independently available", async () => {
    mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-nano" }] });
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "Strategy enhancement", summary: "Grounded proposal", content: "## Proposed direction\nValidate all copy before use." }) } }] });
    const result = await generateArtifactWithLLM({
      artifactType: "strategy",
      deterministicTitle: "Website strategy",
      deterministicSummary: "Original DEMO strategy",
      deterministicPayload: { primaryConversionGoal: "BOOKING" },
      business: { name: "Example Business", category: "Service", location: "Lima", websiteStatus: "no_website", opportunityScore: 80 },
      audit: { auditId: "AUD-LLM-1", overallScore: 30 },
    });
    expect(result).toMatchObject({ model: "gpt-5-nano", title: "Strategy enhancement" });
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ response_format: expect.objectContaining({ type: "json_schema" }) }));
    const demo = await new DemoWebApp1Provider().importLeads();
    expect(demo.records).toHaveLength(3);
  });

  it("keeps the deterministic fallback usable when no LLM model is available", async () => {
    mocks.listLLMModels.mockResolvedValue({ data: [] });
    await expect(generateArtifactWithLLM({
      artifactType: "content", deterministicTitle: "Content plan", deterministicSummary: "DEMO", deterministicPayload: {},
      business: { name: "Example Business", category: null, location: null, websiteStatus: "website_unknown", opportunityScore: 50 }, audit: { auditId: "AUD-FALLBACK-1", overallScore: 50 },
    })).rejects.toThrow("No hay un modelo LLM compatible disponible");
    const source = await new DemoWebApp1Provider().importLeads();
    const audit = await new DemoDigitalAuditProvider().analyze(source.records[0]!);
    expect(buildDemoPipeline(source.records[0]!, audit).find(item => item.artifactType === "content")).toBeDefined();
  });

  it("increments each regenerated artifact version deterministically", () => {
    expect(nextArtifactVersion(undefined)).toBe(1);
    expect(nextArtifactVersion(1)).toBe(2);
    expect(nextArtifactVersion(7)).toBe(8);
  });
});

describe("DEMO end-to-end pipeline service", () => {
  beforeEach(() => {
    for (const mock of [mocks.createAudit, mocks.completeAudit, mocks.getBusiness, mocks.recordIntegrationSync, mocks.saveArtifact, mocks.updateStage, mocks.notifyOwner]) mock.mockReset();
    mocks.getBusiness.mockResolvedValue({
      id: 7, leadId: "LEAD-E2E-1", source: "web_app_1_demo", sourceReference: "LEAD-E2E-1", dataOrigin: "demo_data", name: "E2E Local Business", category: "Clínica dental", location: "Lima", address: null, phone: null, website: null, websiteStatus: "no_website", socialProfiles: null, bookingUrl: null, whatsappUrl: null, opportunityScore: 88, priority: "p1", opportunityTypes: ["new_website"], sourcePayload: {},
    });
    mocks.createAudit.mockResolvedValue({ id: 44, auditId: "AUD-E2E-1" });
    mocks.saveArtifact.mockResolvedValue({ id: 1 });
    mocks.notifyOwner.mockResolvedValue(true);
  });

  it("runs every DEMO stage, persists all artifacts and records the owner notification result", async () => {
    await expect(runDemoPipeline(1, 7)).resolves.toBe("AUD-E2E-1");
    expect(mocks.completeAudit).toHaveBeenCalledWith(44, 28, expect.any(Object));
    expect(mocks.saveArtifact).toHaveBeenCalledTimes(12);
    expect(mocks.updateStage).toHaveBeenCalledWith(44, "build_spec", expect.objectContaining({ status: "ready" }));
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("E2E Local Business") }));
    expect(mocks.recordIntegrationSync).toHaveBeenCalledWith(expect.objectContaining({ connector: "owner_notification", status: "succeeded", reference: "AUD-E2E-1" }));
  });
});
