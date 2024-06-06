import { browser } from '$app/environment';
import { NodeSdk, WebSdk } from '@effect/opentelemetry';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Effect, Layer } from 'effect';

export const TracingLive = Effect.sync(() => {
	if (browser) {
		return WebSdk.layer(() => ({
			resource: { serviceName: 'sveltekit-universal-client' },
			spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
		}));
	} else {
		return NodeSdk.layer(() => ({
			resource: { serviceName: 'sveltekit-universal-server' },
			spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter())
		}));
	}
}).pipe(Layer.unwrapEffect);
