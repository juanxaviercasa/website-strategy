export type PipelineResultEnvelope = {
  version: "1.0";
  event: "strategy.pipeline.completed";
  auditId: string;
  leadId: string;
  status: "completed";
  generatedAt: string;
  artifacts: Array<{ type: string; version: number; title: string }>;
  note: string;
};

export type ResultDelivery = {
  provider: string;
  status: "placeholder";
  reference: string;
  envelope: PipelineResultEnvelope;
  note: string;
};

export interface PipelineResultSink {
  readonly id: string;
  prepare(envelope: PipelineResultEnvelope): Promise<ResultDelivery>;
}

export class WebApp1ResultPlaceholderProvider implements PipelineResultSink {
  readonly id = "web_app_1_result_placeholder";

  async prepare(envelope: PipelineResultEnvelope): Promise<ResultDelivery> {
    return {
      provider: this.id,
      status: "placeholder",
      reference: `outbound-${envelope.auditId}`,
      envelope,
      note: "PLACEHOLDER: el resultado está listo para enviarse a Web App 1 cuando se configure un endpoint HTTPS autorizado y un secreto compartido. No se realizó ninguna llamada externa.",
    };
  }
}

export function getPipelineResultSink() {
  return new WebApp1ResultPlaceholderProvider();
}
