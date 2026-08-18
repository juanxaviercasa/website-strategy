import type { NormalizedInboundLead } from "../contracts/webApp1";

export type AuditProblem = {
  problemId: string;
  category: "ux" | "mobile" | "conversion" | "content" | "trust" | "seo" | "performance" | "accessibility" | "presence";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  evidence: string;
  businessImpact: string;
  recommendation: string;
};

export type DigitalAuditResult = {
  provider: string;
  dataOrigin: "demo_data";
  overallScore: number;
  scoreBreakdown: Record<string, number>;
  presence: { website: string; social: string; reputation: string; evidenceNote: string };
  problems: AuditProblem[];
  opportunities: Array<{ opportunityId: string; type: string; description: string; businessValue: string; priority: "high" | "medium" | "low"; recommendation: string }>;
};

export interface DigitalAuditProvider {
  readonly id: string;
  analyze(lead: NormalizedInboundLead): Promise<DigitalAuditResult>;
}

export class DemoDigitalAuditProvider implements DigitalAuditProvider {
  readonly id = "digital_audit_demo";

  async analyze(lead: NormalizedInboundLead): Promise<DigitalAuditResult> {
    const noWebsite = lead.websiteStatus === "no_website";
    const unavailable = lead.websiteStatus === "website_unavailable";
    const base = noWebsite ? 28 : unavailable ? 34 : lead.websiteStatus === "website_exists" ? 53 : 42;
    const problems: AuditProblem[] = noWebsite
      ? [
          { problemId: "PRB-WEB-001", category: "presence", severity: "critical", description: "No se registra un sitio web para el negocio.", evidence: "DEMO DATA: el contrato de entrada indica website_status=no_website.", businessImpact: "Las personas interesadas no cuentan con un destino propio para comprender la oferta y realizar una acción.", recommendation: "Crear un sitio web local orientado a la conversión con páginas de servicios, confianza y contacto." },
          { problemId: "PRB-CONV-002", category: "conversion", severity: "high", description: "No existe un recorrido de conversión digital verificable.", evidence: "DEMO DATA: no se recibió URL de reserva ni sitio de contacto.", businessImpact: "Las oportunidades de consulta pueden perderse al no existir una ruta clara hacia reserva o contacto.", recommendation: "Definir una CTA primaria y habilitar contacto, solicitud o reserva según el modelo de negocio." },
          { problemId: "PRB-SEO-003", category: "seo", severity: "high", description: "No existe una arquitectura indexable de contenidos locales.", evidence: "DEMO DATA: no hay páginas web que evaluar.", businessImpact: "La visibilidad orgánica local dependerá únicamente de canales ajenos.", recommendation: "Diseñar páginas de servicio y ubicación con metadatos, estructura semántica y contenido útil." },
        ]
      : [
          { problemId: "PRB-VAL-001", category: "content", severity: "high", description: "La propuesta de valor requiere una validación estratégica específica.", evidence: "DEMO DATA: se conoce la URL, pero no se realiza rastreo externo en modo gratuito.", businessImpact: "Una propuesta poco clara puede reducir la comprensión de la oferta y la intención de contacto.", recommendation: "Reestructurar el hero y las secciones clave en torno a audiencia, problema, servicio y resultado esperado." },
          { problemId: "PRB-CONV-002", category: "conversion", severity: "medium", description: "Las rutas de conversión no están verificadas por el proveedor DEMO.", evidence: "DEMO DATA: no hay analítica ni inspección externa conectada.", businessImpact: "No es posible confirmar que cada visita tenga una acción principal clara.", recommendation: "Definir CTA primaria, CTA secundaria y eventos de medición antes de publicar mejoras." },
          { problemId: "PRB-A11Y-003", category: "accessibility", severity: "medium", description: "La accesibilidad necesita una auditoría técnica conectada antes de presentar afirmaciones concluyentes.", evidence: "MISSING DATA: el proveedor gratuito no descarga ni analiza el sitio real.", businessImpact: "Barreras de acceso podrían limitar el uso del sitio por parte de visitantes.", recommendation: "Aplicar una revisión técnica posterior de contraste, estructura semántica, foco y navegación por teclado." },
        ];
    return {
      provider: this.id,
      dataOrigin: "demo_data",
      overallScore: base,
      scoreBreakdown: { ux: base + 2, mobile: base + 4, conversion: Math.max(0, base - 7), content: base + 1, trust: base + 3, seo: Math.max(0, base - 5), performance: base + 5, accessibility: base + 1 },
      presence: {
        website: noWebsite ? "No website detected in DEMO input." : "Website signal received; external crawl is intentionally disconnected.",
        social: lead.socialProfiles ? "Social profiles were supplied by the inbound contract." : "MISSING DATA: no social profiles supplied by the inbound contract.",
        reputation: "MISSING DATA: no review or rating claims are generated in DEMO mode.",
        evidenceNote: "Estos resultados son DEMO DATA y no constituyen una verificación pública del negocio.",
      },
      problems,
      opportunities: problems.map((problem, index) => ({
        opportunityId: `OPP-${String(index + 1).padStart(3, "0")}`,
        type: problem.category === "presence" ? "new_website" : problem.category === "conversion" ? "conversion_path" : "strategic_improvement",
        description: problem.recommendation,
        businessValue: `Resuelve una prioridad ${problem.severity} identificada en el análisis DEMO.`,
        priority: problem.severity === "critical" || problem.severity === "high" ? "high" : "medium",
        recommendation: problem.recommendation,
      })),
    };
  }
}

export class ExternalDigitalAuditPlaceholderProvider implements DigitalAuditProvider {
  readonly id = "digital_audit_api_placeholder";

  async analyze(): Promise<DigitalAuditResult> {
    throw new Error("PLACEHOLDER: el proveedor de auditoría externo aún no está configurado. Use digital_audit_demo para validar el flujo sin coste.");
  }
}

export function getDigitalAuditProvider(providerId: "demo" | "external_placeholder" = "demo"): DigitalAuditProvider {
  return providerId === "external_placeholder" ? new ExternalDigitalAuditPlaceholderProvider() : new DemoDigitalAuditProvider();
}

