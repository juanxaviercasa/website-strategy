import { normalizeWebApp1Export, type NormalizedInboundLead, type WebApp1ExportRow } from "../contracts/webApp1";

export type LeadImportResult = {
  provider: string;
  mode: "demo" | "placeholder";
  records: NormalizedInboundLead[];
  note: string;
};

export interface LeadSourceProvider {
  readonly id: string;
  importLeads(): Promise<LeadImportResult>;
}

const demoRows: WebApp1ExportRow[] = [
  {
    lead_id: "LEAD-DEMO-DENTAL-001",
    business_name: "Clínica Dental Luma",
    category: "Clínica dental",
    location: "Miraflores, Lima, Perú",
    address: "Av. Modelo 120, Miraflores",
    phone: "+51 1 555 0101",
    website_status: "no_website",
    opportunity_score: 86,
    priority: "p1",
    opportunity_types: ["new_website", "booking", "local_visibility"],
    ai_summary: "DEMO: clínica local con oportunidad de convertir consultas en reservas.",
    source: "web_app_1_demo",
    date_analyzed: "2026-08-17T00:00:00.000Z",
  },
  {
    lead_id: "LEAD-DEMO-STUDIO-002",
    business_name: "Norte Arquitectura",
    category: "Estudio de arquitectura",
    location: "Barranco, Lima, Perú",
    address: "Jr. Ejemplo 48, Barranco",
    phone: "+51 1 555 0102",
    website: "https://norte-arquitectura.demo",
    website_status: "website_found",
    opportunity_score: 78,
    priority: "p1",
    opportunity_types: ["conversion_redesign", "portfolio"],
    ai_summary: "DEMO: estudio con sitio existente que requiere una propuesta de valor más clara.",
    source: "web_app_1_demo",
    date_analyzed: "2026-08-17T00:00:00.000Z",
  },
  {
    lead_id: "LEAD-DEMO-FITNESS-003",
    business_name: "Ritmo Studio",
    category: "Estudio de bienestar",
    location: "San Isidro, Lima, Perú",
    address: "Calle Muestra 240, San Isidro",
    phone: "+51 1 555 0103",
    website_status: "website_unknown",
    opportunity_score: 71,
    priority: "p2",
    opportunity_types: ["service_website", "lead_generation"],
    ai_summary: "DEMO: negocio de servicios que necesita aclarar oferta y ruta de contacto.",
    source: "web_app_1_demo",
    date_analyzed: "2026-08-17T00:00:00.000Z",
  },
];

export class DemoWebApp1Provider implements LeadSourceProvider {
  readonly id = "web_app_1_demo";

  async importLeads(): Promise<LeadImportResult> {
    return {
      provider: this.id,
      mode: "demo",
      records: demoRows.map(row => normalizeWebApp1Export(row, "demo_data")),
      note: "DEMO DATA: proveedor local que replica el contrato de exportación de Web App 1 sin llamadas externas.",
    };
  }
}

export class WebApp1ApiPlaceholderProvider implements LeadSourceProvider {
  readonly id = "web_app_1_api_placeholder";

  async importLeads(): Promise<LeadImportResult> {
    return {
      provider: this.id,
      mode: "placeholder",
      records: [],
      note: "PLACEHOLDER: configure posteriormente la URL autorizada y las credenciales del endpoint de Web App 1. El contrato esperado está documentado en server/contracts/webApp1.ts.",
    };
  }
}

export function getLeadSourceProvider(providerId: "demo" | "web_app_1_placeholder" = "demo") {
  return providerId === "web_app_1_placeholder" ? new WebApp1ApiPlaceholderProvider() : new DemoWebApp1Provider();
}
