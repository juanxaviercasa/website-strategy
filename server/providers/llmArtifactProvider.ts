import { invokeLLM, listLLMModels } from "../_core/llm";

export type LlmArtifactInput = {
  artifactType: string;
  deterministicTitle: string;
  deterministicSummary: string | null;
  deterministicPayload: Record<string, unknown>;
  business: { name: string; category: string | null; location: string | null; websiteStatus: string; opportunityScore: number };
  audit: { auditId: string; overallScore: number | null };
};

export type LlmArtifactOutput = { title: string; summary: string; content: string; model: string };

const outputSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    content: { type: "string" },
  },
  required: ["title", "summary", "content"],
  additionalProperties: false,
};

export async function generateArtifactWithLLM(input: LlmArtifactInput): Promise<LlmArtifactOutput> {
  const { data: models } = await listLLMModels();
  const model = models.find(item => item.id === "gpt-5-nano")?.id ?? models.find(item => item.id === "gpt-5-mini")?.id;
  if (!model) throw new Error("No hay un modelo LLM compatible disponible. El artefacto DEMO sigue disponible sin coste.");
  const response = await invokeLLM({
    model,
    maxTokens: 1400,
    response_format: { type: "json_schema", json_schema: { name: "strategy_artifact", strict: true, schema: outputSchema } },
    messages: [
      {
        role: "system",
        content: "You are a digital strategy editor. Return Spanish JSON only. Use only the supplied facts and deterministic artifact as grounding. Never invent testimonials, ratings, certifications, prices, performance claims, metrics, team details or legal statements. Clearly label any recommendation, hypothesis, copy proposal or visual direction as proposed. Keep the result concise, actionable and structured in Markdown.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: `Improve the ${input.artifactType} artifact with a strategic narrative, preserving its factual boundaries.`,
          business: input.business,
          audit: input.audit,
          deterministicArtifact: {
            title: input.deterministicTitle,
            summary: input.deterministicSummary,
            payload: input.deterministicPayload,
          },
        }),
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (typeof content !== "string") throw new Error("El modelo no devolvió contenido estructurado.");
  const parsed = JSON.parse(content) as Omit<LlmArtifactOutput, "model">;
  if (!parsed.title || !parsed.summary || !parsed.content) throw new Error("El modelo devolvió una respuesta incompleta.");
  return { ...parsed, model };
}
