import type { DataOrigin, WebsiteStatus } from "../../shared/pipeline";

export type WebApp1ExportRow = {
  lead_id: string;
  business_name: string;
  category?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  website_status?: "no_website" | "website_found" | "website_unreachable" | "website_unknown" | null;
  google_maps_url?: string | null;
  social_profiles?: Record<string, string> | null;
  whatsapp?: string | null;
  booking?: string | null;
  opportunity_score?: number | null;
  priority?: string | null;
  opportunity_types?: string[] | null;
  opportunity_reasons?: Array<{ label: string; points: number }> | null;
  ai_summary?: string | null;
  source?: string | null;
  date_analyzed?: string | null;
};

export type WebApp1DossierEnvelope = {
  deliveryId?: string;
  dossier: {
    business: { name: string; category?: string | null; city?: string | null; region?: string | null; country?: string | null; address?: string | null; phone?: string | null; website?: string | null; websiteStatus: string };
    opportunity: { id: number; opportunityScore: number; priority: string; opportunityTypes?: string[] | null; scoreReasons?: Array<{ label: string; points: number }>; analysisSummary?: string | null };
  };
};

export type NormalizedInboundLead = {
  leadId: string;
  source: string;
  sourceReference: string | null;
  dataOrigin: DataOrigin;
  name: string;
  category: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  websiteStatus: WebsiteStatus;
  socialProfiles: Record<string, string> | null;
  bookingUrl: string | null;
  whatsappUrl: string | null;
  opportunityScore: number;
  priority: string | null;
  opportunityTypes: string[] | null;
  sourcePayload: Record<string, unknown>;
};

function normalizeWebsiteStatus(value?: string | null): WebsiteStatus {
  if (value === "no_website") return "no_website";
  if (value === "website_found" || value === "website_exists") return "website_exists";
  if (value === "website_unreachable" || value === "website_unavailable") return "website_unavailable";
  return "website_unknown";
}

export function normalizeWebApp1Export(row: WebApp1ExportRow, origin: DataOrigin = "real_data"): NormalizedInboundLead {
  if (!row.lead_id || !row.business_name) throw new Error("El contrato Web App 1 requiere lead_id y business_name.");
  return {
    leadId: row.lead_id,
    source: row.source || "web_app_1",
    sourceReference: row.lead_id,
    dataOrigin: origin,
    name: row.business_name,
    category: row.category ?? null,
    location: row.location ?? null,
    address: row.address ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    websiteStatus: normalizeWebsiteStatus(row.website_status),
    socialProfiles: row.social_profiles ?? null,
    bookingUrl: row.booking ?? null,
    whatsappUrl: row.whatsapp ?? null,
    opportunityScore: row.opportunity_score ?? 0,
    priority: row.priority ?? null,
    opportunityTypes: row.opportunity_types ?? null,
    sourcePayload: row as unknown as Record<string, unknown>,
  };
}

export function normalizeWebApp1Dossier(envelope: WebApp1DossierEnvelope): NormalizedInboundLead {
  const { business, opportunity } = envelope.dossier;
  return {
    leadId: `lead_${opportunity.id}`,
    source: "web_app_1_dossier",
    sourceReference: envelope.deliveryId ?? String(opportunity.id),
    dataOrigin: "real_data",
    name: business.name,
    category: business.category ?? null,
    location: [business.city, business.region, business.country].filter(Boolean).join(", ") || null,
    address: business.address ?? null,
    phone: business.phone ?? null,
    website: business.website ?? null,
    websiteStatus: normalizeWebsiteStatus(business.websiteStatus),
    socialProfiles: null,
    bookingUrl: null,
    whatsappUrl: null,
    opportunityScore: opportunity.opportunityScore,
    priority: opportunity.priority,
    opportunityTypes: opportunity.opportunityTypes ?? null,
    sourcePayload: envelope as unknown as Record<string, unknown>,
  };
}
