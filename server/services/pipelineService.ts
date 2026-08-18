import { nanoid } from "nanoid";
import { artifactToStage, type PipelineStage } from "../../shared/pipeline";
import { createAudit, completeAudit, getBusiness, recordIntegrationSync, saveArtifact, updateStage } from "../db";
import { notifyOwner } from "../_core/notification";
import type { NormalizedInboundLead } from "../contracts/webApp1";
import { getDigitalAuditProvider } from "../providers/digitalAudit";
import { buildDemoPipeline, type GeneratedArtifact } from "./demoPipeline";

function businessAsLead(business: NonNullable<Awaited<ReturnType<typeof getBusiness>>>): NormalizedInboundLead {
  return {
    leadId: business.leadId,
    source: business.source,
    sourceReference: business.sourceReference,
    dataOrigin: business.dataOrigin,
    name: business.name,
    category: business.category,
    location: business.location,
    address: business.address,
    phone: business.phone,
    website: business.website,
    websiteStatus: business.websiteStatus,
    socialProfiles: business.socialProfiles,
    bookingUrl: business.bookingUrl,
    whatsappUrl: business.whatsappUrl,
    opportunityScore: business.opportunityScore,
    priority: business.priority,
    opportunityTypes: business.opportunityTypes,
    sourcePayload: business.sourcePayload,
  };
}

export async function runDemoPipeline(ownerId: number, businessId: number) {
  const business = await getBusiness(ownerId, businessId);
  if (!business) throw new Error("No se encontró el negocio seleccionado.");
  const lead = businessAsLead(business);
  const provider = getDigitalAuditProvider("demo");
  const audit = await createAudit({
    ownerId,
    businessId: business.id,
    auditId: `AUD-${nanoid(9).toUpperCase()}`,
    provider: provider.id,
    dataOrigin: "demo_data",
    websiteStatusSnapshot: business.websiteStatus,
  });
  try {
    const analysis = await provider.analyze(lead);
    await completeAudit(audit.id, analysis.overallScore, analysis.scoreBreakdown);
    const artifacts = buildDemoPipeline(lead, analysis);
    for (const artifact of artifacts) {
      await persistArtifact(audit.id, artifact, "demo_pipeline_generator");
    }
    const delivered = await notifyOwner({
      title: `Pipeline completed: ${lead.name}`,
      content: `${audit.auditId} completed all DEMO stages for ${lead.name}. The strategy, design system, content, Stitch prompts and build specification are ready for review.`,
    });
    await recordIntegrationSync({ ownerId, connector: "owner_notification", direction: "outbound", status: delivered ? "succeeded" : "failed", reference: audit.auditId, details: { event: "pipeline.completed", business: lead.name } });
    return audit.auditId;
  } catch (error) {
    await updateStage(audit.id, "audit", { status: "failed", provider: provider.id, dataOrigin: "demo_data", message: error instanceof Error ? error.message : "Error de auditoría" });
    throw error;
  }
}

export async function persistArtifact(auditPk: number, artifact: GeneratedArtifact, provider = "demo_pipeline_generator") {
  const stage = artifactToStage[artifact.artifactType] as PipelineStage;
  await updateStage(auditPk, stage, { status: "running", provider, dataOrigin: "demo_data", message: `Generating ${artifact.title}.` });
  const result = await saveArtifact({ ...artifact, auditId: auditPk, provider, dataOrigin: "demo_data" });
  await updateStage(auditPk, stage, { status: "ready", provider, dataOrigin: "demo_data", message: artifact.summary });
  return result;
}
