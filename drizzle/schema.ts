import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const dataOriginValues = ["real_data", "demo_data", "ai_inference", "missing_data", "user_provided_data"] as const;
export const websiteStatusValues = ["no_website", "website_exists", "website_unavailable", "website_unknown"] as const;
export const auditStatusValues = ["queued", "running", "completed", "failed"] as const;
export const pipelineStageValues = ["business", "audit", "problems", "opportunities", "strategy", "brand", "sitemap", "design_system", "pages", "content", "design_brief", "stitch_prompts", "build_spec"] as const;
export const stageStatusValues = ["pending", "running", "ready", "failed"] as const;
export const artifactTypeValues = ["audit", "problems", "opportunities", "strategy", "brand_dna", "design_system", "sitemap", "page_specifications", "content", "design_brief", "stitch_prompts", "build_specification"] as const;

export const businesses = mysqlTable("businesses", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  leadId: varchar("leadId", { length: 160 }).notNull(),
  source: varchar("source", { length: 80 }).notNull(),
  sourceReference: varchar("sourceReference", { length: 255 }),
  dataOrigin: mysqlEnum("dataOrigin", dataOriginValues).default("demo_data").notNull(),
  syncStatus: mysqlEnum("syncStatus", ["synced", "pending", "failed"]).default("synced").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 160 }),
  location: varchar("location", { length: 320 }),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 64 }),
  website: varchar("website", { length: 2048 }),
  websiteStatus: mysqlEnum("websiteStatus", websiteStatusValues).default("website_unknown").notNull(),
  socialProfiles: json("socialProfiles").$type<Record<string, string> | null>(),
  bookingUrl: varchar("bookingUrl", { length: 2048 }),
  whatsappUrl: varchar("whatsappUrl", { length: 2048 }),
  opportunityScore: int("opportunityScore").default(0).notNull(),
  priority: varchar("priority", { length: 24 }),
  opportunityTypes: json("opportunityTypes").$type<string[] | null>(),
  sourcePayload: json("sourcePayload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("businesses_owner_lead_idx").on(table.ownerId, table.leadId),
  index("businesses_owner_sync_idx").on(table.ownerId, table.syncStatus),
]);

export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  businessId: int("businessId").notNull(),
  auditId: varchar("auditId", { length: 80 }).notNull().unique(),
  status: mysqlEnum("status", auditStatusValues).default("queued").notNull(),
  provider: varchar("provider", { length: 120 }).notNull(),
  dataOrigin: mysqlEnum("dataOrigin", dataOriginValues).default("demo_data").notNull(),
  overallScore: int("overallScore"),
  scoreBreakdown: json("scoreBreakdown").$type<Record<string, number> | null>(),
  websiteStatusSnapshot: mysqlEnum("websiteStatusSnapshot", websiteStatusValues).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("audits_owner_business_idx").on(table.ownerId, table.businessId),
  index("audits_owner_status_idx").on(table.ownerId, table.status),
]);

export const pipelineStages = mysqlTable("pipelineStages", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  stage: mysqlEnum("stage", pipelineStageValues).notNull(),
  status: mysqlEnum("status", stageStatusValues).default("pending").notNull(),
  provider: varchar("provider", { length: 120 }),
  dataOrigin: mysqlEnum("dataOrigin", dataOriginValues).default("demo_data").notNull(),
  message: varchar("message", { length: 500 }),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("pipeline_stages_audit_stage_idx").on(table.auditId, table.stage),
]);

export const pipelineArtifacts = mysqlTable("pipelineArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  artifactType: mysqlEnum("artifactType", artifactTypeValues).notNull(),
  version: int("version").notNull(),
  provider: varchar("provider", { length: 120 }).notNull(),
  dataOrigin: mysqlEnum("dataOrigin", dataOriginValues).default("demo_data").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  promptTemplateVersion: varchar("promptTemplateVersion", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("artifacts_audit_type_version_idx").on(table.auditId, table.artifactType, table.version),
  index("artifacts_audit_type_idx").on(table.auditId, table.artifactType),
]);

export const integrationSyncs = mysqlTable("integrationSyncs", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  connector: varchar("connector", { length: 120 }).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  status: mysqlEnum("status", ["succeeded", "failed", "placeholder"]).notNull(),
  reference: varchar("reference", { length: 255 }),
  details: json("details").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("integration_syncs_owner_created_idx").on(table.ownerId, table.createdAt)]);

export const exports = mysqlTable("exports", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  auditId: int("auditId").notNull(),
  artifactType: mysqlEnum("artifactType", artifactTypeValues).notNull(),
  format: mysqlEnum("format", ["json", "markdown", "pdf"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("exports_audit_idx").on(table.auditId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type Audit = typeof audits.$inferSelect;
export type PipelineArtifact = typeof pipelineArtifacts.$inferSelect;
