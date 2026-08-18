import { and, desc, eq, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  audits,
  businesses,
  exports,
  integrationSyncs,
  pipelineArtifacts,
  pipelineStages,
  type InsertUser,
  users,
} from "../drizzle/schema";
import type { NormalizedInboundLead } from "./contracts/webApp1";
import { nextArtifactVersion, PIPELINE_STAGES, type DataOrigin, type PipelineStage } from "../shared/pipeline";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Connection unavailable:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function upsertImportedBusiness(ownerId: number, lead: NormalizedInboundLead) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const values = {
    ownerId,
    leadId: lead.leadId,
    source: lead.source,
    sourceReference: lead.sourceReference,
    dataOrigin: lead.dataOrigin,
    syncStatus: "synced" as const,
    name: lead.name,
    category: lead.category,
    location: lead.location,
    address: lead.address,
    phone: lead.phone,
    website: lead.website,
    websiteStatus: lead.websiteStatus,
    socialProfiles: lead.socialProfiles,
    bookingUrl: lead.bookingUrl,
    whatsappUrl: lead.whatsappUrl,
    opportunityScore: lead.opportunityScore,
    priority: lead.priority,
    opportunityTypes: lead.opportunityTypes,
    sourcePayload: lead.sourcePayload,
  };
  await db.insert(businesses).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  return (await db.select().from(businesses).where(and(eq(businesses.ownerId, ownerId), eq(businesses.leadId, lead.leadId))).limit(1))[0]!;
}

export async function recordIntegrationSync(input: { ownerId: number; connector: string; direction: "inbound" | "outbound"; status: "succeeded" | "failed" | "placeholder"; reference?: string | null; details?: Record<string, unknown> | null }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(integrationSyncs).values({ ...input, reference: input.reference ?? null, details: input.details ?? null });
}

export async function listBusinesses(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(businesses).where(eq(businesses.ownerId, ownerId)).orderBy(desc(businesses.opportunityScore), desc(businesses.updatedAt));
}

export async function getBusiness(ownerId: number, businessId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(businesses).where(and(eq(businesses.ownerId, ownerId), eq(businesses.id, businessId))).limit(1))[0];
}

export async function createAudit(input: { ownerId: number; businessId: number; auditId: string; provider: string; dataOrigin: DataOrigin; websiteStatusSnapshot: "no_website" | "website_exists" | "website_unavailable" | "website_unknown" }) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const result = await db.insert(audits).values({ ...input, status: "running", startedAt: new Date() });
  const auditId = Number(result[0].insertId);
  await db.insert(pipelineStages).values(PIPELINE_STAGES.map(({ key }) => ({
    auditId,
    stage: key,
    status: key === "business" ? ("ready" as const) : ("pending" as const),
    provider: key === "business" ? "web_app_1_contract" : null,
    dataOrigin: input.dataOrigin,
    message: key === "business" ? "Business context imported from the inbound contract." : null,
    completedAt: key === "business" ? new Date() : null,
  })));
  return (await db.select().from(audits).where(eq(audits.id, auditId)).limit(1))[0]!;
}

export async function completeAudit(auditPk: number, score: number, breakdown: Record<string, number>) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  await db.update(audits).set({ status: "completed", overallScore: score, scoreBreakdown: breakdown, completedAt: new Date() }).where(eq(audits.id, auditPk));
}

export async function updateStage(auditPk: number, stage: PipelineStage, input: { status: "pending" | "running" | "ready" | "failed"; provider?: string | null; dataOrigin?: DataOrigin; message?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  await db.update(pipelineStages).set({
    ...input,
    completedAt: input.status === "ready" ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(eq(pipelineStages.auditId, auditPk), eq(pipelineStages.stage, stage)));
}

export async function saveArtifact(input: { auditId: number; artifactType: (typeof pipelineArtifacts.artifactType.enumValues)[number]; provider: string; dataOrigin: DataOrigin; title: string; summary: string; payload: Record<string, unknown>; promptTemplateVersion?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const current = await db.select({ version: max(pipelineArtifacts.version) }).from(pipelineArtifacts).where(and(eq(pipelineArtifacts.auditId, input.auditId), eq(pipelineArtifacts.artifactType, input.artifactType)));
  const version = nextArtifactVersion(current[0]?.version);
  const result = await db.insert(pipelineArtifacts).values({ ...input, version, promptTemplateVersion: input.promptTemplateVersion ?? null });
  return (await db.select().from(pipelineArtifacts).where(eq(pipelineArtifacts.id, Number(result[0].insertId))).limit(1))[0]!;
}

export async function listAuditArtifacts(auditPk: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineArtifacts).where(eq(pipelineArtifacts.auditId, auditPk)).orderBy(desc(pipelineArtifacts.createdAt), desc(pipelineArtifacts.version));
}

export async function getLatestArtifact(auditPk: number, artifactType: (typeof pipelineArtifacts.artifactType.enumValues)[number]) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(pipelineArtifacts).where(and(eq(pipelineArtifacts.auditId, auditPk), eq(pipelineArtifacts.artifactType, artifactType))).orderBy(desc(pipelineArtifacts.version)).limit(1))[0];
}

export async function listAuditsWithBusinesses(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ audit: audits, business: businesses }).from(audits).innerJoin(businesses, eq(audits.businessId, businesses.id)).where(eq(audits.ownerId, ownerId)).orderBy(desc(audits.createdAt));
}

export async function getAuditDetail(ownerId: number, auditPublicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const item = (await db.select({ audit: audits, business: businesses }).from(audits).innerJoin(businesses, eq(audits.businessId, businesses.id)).where(and(eq(audits.ownerId, ownerId), eq(audits.auditId, auditPublicId))).limit(1))[0];
  if (!item) return undefined;
  const [stages, artifacts] = await Promise.all([
    db.select().from(pipelineStages).where(eq(pipelineStages.auditId, item.audit.id)),
    listAuditArtifacts(item.audit.id),
  ]);
  return { ...item, stages, artifacts };
}

export async function createExportRecord(input: { ownerId: number; auditId: number; artifactType: (typeof exports.artifactType.enumValues)[number]; format: "json" | "markdown" | "pdf"; fileName: string; storageKey: string; storageUrl: string }) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  const result = await db.insert(exports).values(input);
  return (await db.select().from(exports).where(eq(exports.id, Number(result[0].insertId))).limit(1))[0]!;
}

export async function listExports(ownerId: number, auditPk: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exports).where(and(eq(exports.ownerId, ownerId), eq(exports.auditId, auditPk))).orderBy(desc(exports.createdAt));
}
