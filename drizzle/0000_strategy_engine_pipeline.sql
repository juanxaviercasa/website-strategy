CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `users_id` PRIMARY KEY(`id`),
  CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE TABLE IF NOT EXISTS `businesses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerId` int NOT NULL,
  `leadId` varchar(160) NOT NULL,
  `source` varchar(80) NOT NULL,
  `sourceReference` varchar(255),
  `dataOrigin` enum('real_data','demo_data','ai_inference','missing_data','user_provided_data') NOT NULL DEFAULT 'demo_data',
  `syncStatus` enum('synced','pending','failed') NOT NULL DEFAULT 'synced',
  `name` varchar(255) NOT NULL,
  `category` varchar(160),
  `location` varchar(320),
  `address` varchar(500),
  `phone` varchar(64),
  `website` varchar(2048),
  `websiteStatus` enum('no_website','website_exists','website_unavailable','website_unknown') NOT NULL DEFAULT 'website_unknown',
  `socialProfiles` json,
  `bookingUrl` varchar(2048),
  `whatsappUrl` varchar(2048),
  `opportunityScore` int NOT NULL DEFAULT 0,
  `priority` varchar(24),
  `opportunityTypes` json,
  `sourcePayload` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
  CONSTRAINT `businesses_owner_lead_idx` UNIQUE(`ownerId`,`leadId`),
  INDEX `businesses_owner_sync_idx` (`ownerId`,`syncStatus`)
);

CREATE TABLE IF NOT EXISTS `audits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerId` int NOT NULL,
  `businessId` int NOT NULL,
  `auditId` varchar(80) NOT NULL,
  `status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  `provider` varchar(120) NOT NULL,
  `dataOrigin` enum('real_data','demo_data','ai_inference','missing_data','user_provided_data') NOT NULL DEFAULT 'demo_data',
  `overallScore` int,
  `scoreBreakdown` json,
  `websiteStatusSnapshot` enum('no_website','website_exists','website_unavailable','website_unknown') NOT NULL,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `audits_id` PRIMARY KEY(`id`),
  CONSTRAINT `audits_auditId_unique` UNIQUE(`auditId`),
  INDEX `audits_owner_business_idx` (`ownerId`,`businessId`),
  INDEX `audits_owner_status_idx` (`ownerId`,`status`)
);

CREATE TABLE IF NOT EXISTS `pipelineStages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `auditId` int NOT NULL,
  `stage` enum('business','audit','problems','opportunities','strategy','brand','sitemap','design_system','pages','content','design_brief','stitch_prompts','build_spec') NOT NULL,
  `status` enum('pending','running','ready','failed') NOT NULL DEFAULT 'pending',
  `provider` varchar(120),
  `dataOrigin` enum('real_data','demo_data','ai_inference','missing_data','user_provided_data') NOT NULL DEFAULT 'demo_data',
  `message` varchar(500),
  `completedAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pipelineStages_id` PRIMARY KEY(`id`),
  CONSTRAINT `pipeline_stages_audit_stage_idx` UNIQUE(`auditId`,`stage`)
);

CREATE TABLE IF NOT EXISTS `pipelineArtifacts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `auditId` int NOT NULL,
  `artifactType` enum('audit','problems','opportunities','strategy','brand_dna','design_system','sitemap','page_specifications','content','design_brief','stitch_prompts','build_specification') NOT NULL,
  `version` int NOT NULL,
  `provider` varchar(120) NOT NULL,
  `dataOrigin` enum('real_data','demo_data','ai_inference','missing_data','user_provided_data') NOT NULL DEFAULT 'demo_data',
  `title` varchar(255) NOT NULL,
  `summary` text,
  `payload` json NOT NULL,
  `promptTemplateVersion` varchar(40),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `pipelineArtifacts_id` PRIMARY KEY(`id`),
  CONSTRAINT `artifacts_audit_type_version_idx` UNIQUE(`auditId`,`artifactType`,`version`),
  INDEX `artifacts_audit_type_idx` (`auditId`,`artifactType`)
);

CREATE TABLE IF NOT EXISTS `integrationSyncs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerId` int NOT NULL,
  `connector` varchar(120) NOT NULL,
  `direction` enum('inbound','outbound') NOT NULL,
  `status` enum('succeeded','failed','placeholder') NOT NULL,
  `reference` varchar(255),
  `details` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `integrationSyncs_id` PRIMARY KEY(`id`),
  INDEX `integration_syncs_owner_created_idx` (`ownerId`,`createdAt`)
);

CREATE TABLE IF NOT EXISTS `exports` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ownerId` int NOT NULL,
  `auditId` int NOT NULL,
  `artifactType` enum('audit','problems','opportunities','strategy','brand_dna','design_system','sitemap','page_specifications','content','design_brief','stitch_prompts','build_specification') NOT NULL,
  `format` enum('json','markdown','pdf') NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `storageKey` varchar(512) NOT NULL,
  `storageUrl` varchar(1024) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `exports_id` PRIMARY KEY(`id`),
  INDEX `exports_audit_idx` (`auditId`,`createdAt`)
);
