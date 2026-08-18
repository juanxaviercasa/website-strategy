# Connector placeholders and module contract

## Operating rule

The application is intentionally **free-first**. It is fully usable with the built-in DEMO lead source, DEMO audit provider and deterministic artifact generator. An optional LLM enhancement uses the project model gateway and is always labeled as **AI inference**. No paid data provider is assumed or invoked by default.

| Boundary | Current provider | Production replacement point | Required future configuration |
|---|---|---|---|
| Web App 1 → Strategy Engine | `web_app_1_demo` or `web_app_1_dossier_contract` | `LeadSourceProvider` | An authorized HTTPS endpoint or a signed contract delivery.
| Digital audit | `demo_digital_audit` | `DigitalAuditProvider` | Provider-specific API key, terms review and source attribution.
| Strategy refinement | `built_in_llm:gpt-5-nano` when invoked | `LlmArtifactProvider` | No secret required in the managed project; this call may consume project credits.
| Strategy Engine → downstream module | `web_app_1_result_placeholder` | `PipelineResultSink` | Authorized HTTPS endpoint and shared signing secret.
| Export storage | Built-in S3 helper | Built-in S3 helper | No user action required; records retain only storage keys and URLs.

## Inbound contract

The stable primary key across modules is `lead_id`. The preferred Web App 1 handoff is the dossier form accepted by `pipeline.importWebApp1Dossier`; the compatibility form is accepted by `pipeline.importFromWebApp1Contract`. Both normalize into the local business record and preserve the original input in `sourcePayload`.

## Outbound contract

`pipeline.prepareResultHandoff` creates a versioned `strategy.pipeline.completed` envelope. In this project it is a non-delivering placeholder by design: it records a `placeholder` integration event but makes no external network request. Replace only `WebApp1ResultPlaceholderProvider` after endpoint authorization and secret management have been completed outside this source code.

## Data boundaries

Every artifact exposes `provider` and `dataOrigin`. The allowed origins are `demo_data`, `real_data`, `ai_inference` and `proposed_direction`. Any artifact exported from the system repeats its origin and includes a validation disclaimer. This prevents a recommendation or an AI inference from being presented as verified business fact.
