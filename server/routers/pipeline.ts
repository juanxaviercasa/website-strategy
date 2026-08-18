import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createExportRecord, getAuditDetail, getLatestArtifact, listAuditsWithBusinesses, listBusinesses, listExports, recordIntegrationSync, saveArtifact, updateStage, upsertImportedBusiness } from "../db";
import { normalizeWebApp1Export } from "../contracts/webApp1";
import { normalizeWebApp1Dossier } from "../contracts/webApp1";
import { getLeadSourceProvider } from "../providers/leadSource";
import { getPipelineResultSink } from "../providers/resultSink";
import { generateArtifactWithLLM } from "../providers/llmArtifactProvider";
import { artifactToStage } from "../../shared/pipeline";
import { createArtifactExport } from "../services/exportService";
import { buildDemoPipeline } from "../services/demoPipeline";
import { runDemoPipeline, persistArtifact } from "../services/pipelineService";
import { protectedProcedure, router } from "../_core/trpc";

const artifactTypeSchema = z.enum(["audit", "problems", "opportunities", "strategy", "brand_dna", "design_system", "sitemap", "page_specifications", "content", "design_brief", "stitch_prompts", "build_specification"]);

export const pipelineRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [businesses, audits] = await Promise.all([listBusinesses(ctx.user.id), listAuditsWithBusinesses(ctx.user.id)]);
    return { businesses, audits, integration: { inbound: "web_app_1_demo", outbound: "web_app_1_placeholder", mode: "free_first" } };
  }),

  importDemo: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = getLeadSourceProvider("demo");
    const result = await provider.importLeads();
    const records = await Promise.all(result.records.map(lead => upsertImportedBusiness(ctx.user.id, lead)));
    await recordIntegrationSync({ ownerId: ctx.user.id, connector: provider.id, direction: "inbound", status: "succeeded", reference: `import-${new Date().toISOString()}`, details: { count: records.length, note: result.note } });
    return { count: records.length, provider: result.provider, note: result.note };
  }),

  importFromWebApp1Contract: protectedProcedure.input(z.object({
    lead_id: z.string().min(1), business_name: z.string().min(1), category: z.string().nullable().optional(), location: z.string().nullable().optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(), website: z.string().nullable().optional(), website_status: z.enum(["no_website", "website_found", "website_unreachable", "website_unknown"]).nullable().optional(), google_maps_url: z.string().nullable().optional(), social_profiles: z.record(z.string(), z.string()).nullable().optional(), whatsapp: z.string().nullable().optional(), booking: z.string().nullable().optional(), opportunity_score: z.number().int().min(0).max(100).nullable().optional(), priority: z.string().nullable().optional(), opportunity_types: z.array(z.string()).nullable().optional(), opportunity_reasons: z.array(z.object({ label: z.string(), points: z.number() })).nullable().optional(), ai_summary: z.string().nullable().optional(), source: z.string().nullable().optional(), date_analyzed: z.string().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    const lead = normalizeWebApp1Export(input, "real_data");
    const business = await upsertImportedBusiness(ctx.user.id, lead);
    await recordIntegrationSync({ ownerId: ctx.user.id, connector: "web_app_1_contract", direction: "inbound", status: "succeeded", reference: lead.leadId, details: { mode: "contract", source: lead.source } });
    return business;
  }),

  importWebApp1Dossier: protectedProcedure.input(z.object({
    deliveryId: z.string().min(1).optional(),
    dossier: z.object({
      business: z.object({ name: z.string().min(1), category: z.string().nullable().optional(), city: z.string().nullable().optional(), region: z.string().nullable().optional(), country: z.string().nullable().optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(), website: z.string().nullable().optional(), websiteStatus: z.string().min(1) }),
      opportunity: z.object({ id: z.number().int().positive(), opportunityScore: z.number().int().min(0).max(100), priority: z.string().min(1), opportunityTypes: z.array(z.string()).nullable().optional(), scoreReasons: z.array(z.object({ label: z.string(), points: z.number() })).optional(), analysisSummary: z.string().nullable().optional() }),
    }),
  })).mutation(async ({ ctx, input }) => {
    const lead = normalizeWebApp1Dossier(input);
    const business = await upsertImportedBusiness(ctx.user.id, lead);
    await recordIntegrationSync({ ownerId: ctx.user.id, connector: "web_app_1_dossier_contract", direction: "inbound", status: "succeeded", reference: input.deliveryId ?? lead.leadId, details: { leadId: lead.leadId, contract: "dossier.v2" } });
    return business;
  }),

  runDemo: protectedProcedure.input(z.object({ businessId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const auditId = await runDemoPipeline(ctx.user.id, input.businessId);
      return { auditId };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "No se pudo completar el pipeline DEMO." });
    }
  }),

  detail: protectedProcedure.input(z.object({ auditId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    return detail;
  }),

  regenerateDemoArtifact: protectedProcedure.input(z.object({ auditId: z.string().min(1), artifactType: artifactTypeSchema })).mutation(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    const auditArtifact = await getLatestArtifact(detail.audit.id, "audit");
    if (!auditArtifact) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "La auditoría debe existir antes de regenerar un artefacto." });
    const generated = buildDemoPipeline({
      leadId: detail.business.leadId, source: detail.business.source, sourceReference: detail.business.sourceReference, dataOrigin: detail.business.dataOrigin, name: detail.business.name, category: detail.business.category, location: detail.business.location, address: detail.business.address, phone: detail.business.phone, website: detail.business.website, websiteStatus: detail.business.websiteStatus, socialProfiles: detail.business.socialProfiles, bookingUrl: detail.business.bookingUrl, whatsappUrl: detail.business.whatsappUrl, opportunityScore: detail.business.opportunityScore, priority: detail.business.priority, opportunityTypes: detail.business.opportunityTypes, sourcePayload: detail.business.sourcePayload,
    }, auditArtifact.payload as any).find(item => item.artifactType === input.artifactType);
    if (!generated) throw new TRPCError({ code: "BAD_REQUEST", message: "El artefacto solicitado no es regenerable." });
    return persistArtifact(detail.audit.id, generated, "demo_pipeline_regeneration");
  }),

  improveWithLlm: protectedProcedure.input(z.object({ auditId: z.string().min(1), artifactType: artifactTypeSchema })).mutation(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    const source = await getLatestArtifact(detail.audit.id, input.artifactType);
    if (!source) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Primero genera el artefacto DEMO para que el LLM tenga una base verificable." });
    const stage = artifactToStage[input.artifactType];
    await updateStage(detail.audit.id, stage, { status: "running", provider: "built_in_llm", dataOrigin: "ai_inference", message: "Refining artifact with a cost-aware LLM call." });
    try {
      const result = await generateArtifactWithLLM({
        artifactType: input.artifactType,
        deterministicTitle: source.title,
        deterministicSummary: source.summary,
        deterministicPayload: source.payload,
        business: { name: detail.business.name, category: detail.business.category, location: detail.business.location, websiteStatus: detail.business.websiteStatus, opportunityScore: detail.business.opportunityScore },
        audit: { auditId: detail.audit.auditId, overallScore: detail.audit.overallScore },
      });
      const artifact = await saveArtifact({
        auditId: detail.audit.id,
        artifactType: input.artifactType,
        provider: `built_in_llm:${result.model}`,
        dataOrigin: "ai_inference",
        title: result.title,
        summary: result.summary,
        payload: { mode: "LLM ENHANCEMENT", generatedMarkdown: result.content, groundedInArtifactVersion: source.version, factualBoundary: "AI INFERENCE: validate recommendations and all public-facing copy before use." },
        promptTemplateVersion: "llm-artifact-v1",
      });
      await updateStage(detail.audit.id, stage, { status: "ready", provider: `built_in_llm:${result.model}`, dataOrigin: "ai_inference", message: "LLM enhancement ready; review AI inference before external use." });
      return { artifact, costNotice: "This optional LLM enhancement uses project credits. The DEMO generator remains available without an LLM call." };
    } catch (error) {
      await updateStage(detail.audit.id, stage, { status: "ready", provider: source.provider, dataOrigin: source.dataOrigin, message: "LLM enhancement failed; deterministic DEMO version remains available." });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "No se pudo mejorar el artefacto con LLM." });
    }
  }),

  prepareResultHandoff: protectedProcedure.input(z.object({ auditId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    if (detail.audit.status !== "completed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Solo los pipelines completados pueden preparar un handoff de resultados." });
    const sink = getPipelineResultSink();
    const result = await sink.prepare({
      version: "1.0",
      event: "strategy.pipeline.completed",
      auditId: detail.audit.auditId,
      leadId: detail.business.leadId,
      status: "completed",
      generatedAt: new Date().toISOString(),
      artifacts: detail.artifacts.map(item => ({ type: item.artifactType, version: item.version, title: item.title })),
      note: "Generated by the strategy pipeline; verify business facts before external use.",
    });
    await recordIntegrationSync({ ownerId: ctx.user.id, connector: result.provider, direction: "outbound", status: result.status, reference: result.reference, details: { auditId: detail.audit.auditId, leadId: detail.business.leadId, event: result.envelope.event } });
    return result;
  }),

  exportArtifact: protectedProcedure.input(z.object({
    auditId: z.string().min(1),
    artifactType: z.enum(["design_system", "content", "build_specification"]),
    format: z.enum(["json", "markdown", "pdf"]),
  })).mutation(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    const artifact = await getLatestArtifact(detail.audit.id, input.artifactType);
    if (!artifact) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El artefacto elegido todavía no está disponible para exportar." });
    try {
      return await createArtifactExport({
        auditId: detail.audit.id,
        auditPublicId: detail.audit.auditId,
        ownerId: ctx.user.id,
        businessName: detail.business.name,
        artifactType: input.artifactType,
        title: artifact.title,
        summary: artifact.summary,
        payload: artifact.payload,
        provider: artifact.provider,
        dataOrigin: artifact.dataOrigin,
      }, input.format);
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "No se pudo generar la exportación." });
    }
  }),

  exports: protectedProcedure.input(z.object({ auditId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const detail = await getAuditDetail(ctx.user.id, input.auditId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "No se encontró esta auditoría." });
    return listExports(ctx.user.id, detail.audit.id);
  }),
});
