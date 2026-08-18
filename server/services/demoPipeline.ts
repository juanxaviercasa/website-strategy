import type { NormalizedInboundLead } from "../contracts/webApp1";
import type { DigitalAuditResult } from "../providers/digitalAudit";

export type GeneratedArtifact = {
  artifactType: "audit" | "problems" | "opportunities" | "strategy" | "brand_dna" | "design_system" | "sitemap" | "page_specifications" | "content" | "design_brief" | "stitch_prompts" | "build_specification";
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  promptTemplateVersion?: string;
};

function recommendation(lead: NormalizedInboundLead) {
  return lead.websiteStatus === "no_website"
    ? { type: "NEW_WEBSITE", rationale: "El contrato de entrada no registra un website; el primer activo recomendado es una presencia local propia enfocada en conversión." }
    : { type: "CONVERSION_REDESIGN", rationale: "Existe una señal de sitio web, pero el modo DEMO no verifica su recorrido de conversión; se recomienda rediseñar con objetivos y medición explícitos." };
}

export function buildDemoPipeline(lead: NormalizedInboundLead, audit: DigitalAuditResult): GeneratedArtifact[] {
  const solution = recommendation(lead);
  const businessContext = { lead_id: lead.leadId, business: lead.name, category: lead.category, location: lead.location, data_origin: lead.dataOrigin };
  const primaryGoal = lead.category?.toLowerCase().includes("dental") ? "BOOKING" : "INQUIRY";
  const primaryCta = primaryGoal === "BOOKING" ? "Solicitar una cita" : "Solicitar una consulta";
  const brand = {
    status: "PROPOSED BRAND DIRECTION",
    disclaimer: "Dirección propuesta a partir de DEMO DATA y AI INFERENCE. No representa branding oficial.",
    personality: ["cercana", "clara", "profesional"],
    tone: "Directo, tranquilizador y específico sobre beneficios concretos.",
    visualDirection: "Editorial local contemporáneo, con espacios amplios, jerarquía marcada y fotografía documental auténtica.",
    colorDirection: "Base mineral cálida, tinta azul profunda y acento terracota sobrio.",
    typographyDirection: "Titulares con serif editorial y cuerpo sans-serif de alta legibilidad.",
    photographyDirection: "Imágenes reales del equipo, el entorno y el servicio. No usar fotos genéricas como evidencia de resultados.",
    uiDirection: "Componentes claros, CTAs contrastados, tarjetas informativas y navegación concentrada en la acción principal.",
  };
  const designSystem = {
    status: "PROPOSED DESIGN SYSTEM",
    colors: { ink: "#18344A", canvas: "#F7F3ED", surface: "#FFFFFF", accent: "#C86145", line: "#D8D0C4", success: "#2F6C5E" },
    typography: { display: "Fraunces, Georgia, serif", body: "DM Sans, Arial, sans-serif", scale: { display: "56/60", h1: "42/48", h2: "30/36", body: "16/26", label: "12/16" } },
    spacing: { unit: 4, scale: [4, 8, 12, 16, 24, 32, 48, 64, 96] },
    components: { buttons: "Píldora suave, altura mínima de 48px y foco visible.", cards: "Radio 20px, sombra discreta y borde cálido.", forms: "Etiquetas persistentes, ayuda contextual y errores descriptivos.", navigation: "Rutas mínimas y CTA persistente sin competir con la acción primaria." },
    responsiveRules: ["Priorizar una columna hasta 768px.", "Mantener CTAs de 48px o más.", "Evitar información crítica solo en hover.", "Conservar orden de lectura semántico en todos los breakpoints."],
  };
  const sitemap = [
    { page: "Inicio", purpose: "Explicar oferta, construir confianza y conducir a la acción principal.", primaryCta },
    { page: "Servicios", purpose: "Organizar la oferta por necesidades y orientar la decisión.", primaryCta: "Explorar servicios" },
    { page: "Sobre el negocio", purpose: "Dar contexto, credenciales verificables y cercanía.", primaryCta: "Conocer el enfoque" },
    { page: "Contacto", purpose: "Reducir fricción para iniciar una consulta o reserva.", primaryCta },
  ];
  const pages = sitemap.map(item => ({
    pageName: item.page,
    purpose: item.purpose,
    audience: "Persona local que evalúa el servicio y busca una vía clara de contacto.",
    primaryGoal: item.primaryCta === primaryCta ? primaryGoal : "INFORMATION",
    primaryCta: item.primaryCta,
    secondaryCta: "Llamar al negocio",
    sections: item.page === "Inicio" ? ["Hero con propuesta de valor", "Prueba de confianza verificable", "Servicios prioritarios", "Proceso", "CTA final"] : ["Introducción", "Contenido principal", "Elementos de confianza", "CTA"],
    contentRequirements: ["Servicios validados", "Información de contacto", "Imágenes propias", "Preguntas frecuentes reales"],
    trustElements: ["Credenciales comprobables", "Información de ubicación", "Políticas aplicables"],
    conversionElements: ["CTA principal", "CTA secundaria", "Formulario o canal de contacto confirmado"],
    responsiveBehavior: "Contenido a una columna en móvil, CTAs fáciles de alcanzar y elementos esenciales antes del scroll profundo.",
  }));
  return [
    { artifactType: "audit", title: "Digital audit", summary: "Puntuación y señales DEMO estructuradas.", payload: audit as unknown as Record<string, unknown> },
    { artifactType: "problems", title: "Prioritized problems", summary: `${audit.problems.length} problemas priorizados con evidencia y recomendación.`, payload: { items: audit.problems } },
    { artifactType: "opportunities", title: "Commercial opportunities", summary: "Oportunidades derivadas de los problemas detectados.", payload: { items: audit.opportunities } },
    { artifactType: "strategy", title: "Website strategy", summary: solution.rationale, payload: { businessContext, solution, primaryConversionGoal: primaryGoal, secondaryConversionGoals: ["CALL", "WHATSAPP"], conversionJourney: ["ATTENTION", "INTEREST", "TRUST", "DESIRE", "ACTION"], primaryCta, secondaryCta: "Llamar al negocio" } },
    { artifactType: "brand_dna", title: "Brand DNA", summary: "Dirección de marca propuesta, no oficial.", payload: brand },
    { artifactType: "design_system", title: "Design system", summary: "Tokens visuales propuestos que orientan todas las páginas.", payload: designSystem },
    { artifactType: "sitemap", title: "Sitemap", summary: "Arquitectura de páginas basada en la solución propuesta.", payload: { rationale: "Las páginas se derivan de oferta, confianza, SEO local y conversión; no de una plantilla universal.", pages: sitemap } },
    { artifactType: "page_specifications", title: "Page specifications", summary: "Propósito, CTAs y comportamiento para cada página.", payload: { pages } },
    { artifactType: "content", title: "Content plan", summary: "Requisitos de contenido y copy DEMO para validar antes de publicación.", payload: { disclaimer: "DEMO COPY: validar con el negocio antes de publicar; no afirma hechos no verificados.", required: ["Logo", "Servicios y condiciones validadas", "Fotos propias", "Datos de contacto", "Políticas"], recommended: ["Biografía del equipo", "Preguntas frecuentes", "Proceso de atención"], optional: ["Guías o recursos"], pageCopy: sitemap.map(page => ({ page: page.page, headline: `Una forma más clara de conocer ${lead.name}`, supportingCopy: "Propuesta de copy DEMO que debe validarse con la información oficial del negocio.", cta: page.primaryCta })) } },
    { artifactType: "design_brief", title: "Design brief", summary: "Brief orientado a decisión, consistencia y conversión.", payload: { objective: `Diseñar una experiencia ${solution.type.toLowerCase()} que facilite ${primaryGoal.toLowerCase()} para ${lead.name}.`, audience: "Personas locales con intención de evaluar y contactar al negocio.", visualDirection: brand.visualDirection, designSystem, successSignals: ["CTA principal visible", "Oferta comprensible", "Información de confianza verificable", "Experiencia móvil prioritaria"] } },
    { artifactType: "stitch_prompts", title: "Stitch prompts", summary: "Prompts listos para una herramienta de diseño; no ejecutan Stitch.", promptTemplateVersion: "1.0", payload: { masterPrompt: `Create a conversion-oriented local business website for ${lead.name}. Context: ${lead.category ?? "local service"} in ${lead.location ?? "its local area"}. Use the proposed visual direction: ${brand.visualDirection}. Apply this design system: ink #18344A, canvas #F7F3ED, accent #C86145; editorial serif headings and accessible sans body. Prioritize the primary CTA: ${primaryCta}. Do not invent testimonials, ratings, credentials or commercial claims.`, pagePrompts: pages.map(page => ({ page: page.pageName, prompt: `Design the ${page.pageName} page. Purpose: ${page.purpose}. Primary CTA: ${page.primaryCta}. Include ${page.sections.join(", ")}. Maintain mobile-first hierarchy, visible focus states and clear conversion path.` })) } },
    { artifactType: "build_specification", title: "Website build specification", summary: "Handoff técnico accionable para el módulo de construcción.", payload: { version: "1.0", boundary: "Strategy and specification only; this module does not build or deploy the website.", recommendation: solution, pages, reusableComponents: ["Navbar", "Hero", "Service cards", "Trust section", "FAQ", "Contact form", "CTA", "Footer"].map(name => ({ name, purpose: "Componente reutilizable orientado a claridad y conversión.", behavior: "Responsive, accesible y conectado al design system.", conversionObjective: primaryGoal })), dynamicRequirements: ["Form validation", "CTA event tracking", "Consent-aware analytics placeholder"], futureIntegrations: ["Booking provider placeholder", "WhatsApp CTA placeholder", "Analytics placeholder"], dataRequirements: { mustValidateBeforeLaunch: ["Oferta", "Precios si aplican", "Contacto", "Credenciales", "Políticas", "Imágenes y consentimiento de uso"] } } },
  ];
}
