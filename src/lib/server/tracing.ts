import { NodeSdk } from '@effect/opentelemetry';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export const TracingLive = NodeSdk.layer(() => ({
	resource: { serviceName: 'sveltekit-server' },
	spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
}));
