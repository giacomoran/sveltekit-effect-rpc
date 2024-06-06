import type * as Kit from '@sveltejs/kit';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { ClientLive, type ClientTag } from './client.js';
import { SvelteKitLoadEvent } from './svelte-kit-load-event.js';
import { TracingLive } from './tracing.js';

export type ServicesAppUI = ClientTag;
export type ServicesLoadUI = SvelteKitLoadEvent;

const ServicesAppUILive = Layer.mergeAll(ClientLive, TracingLive);
export const runtimeUI = ManagedRuntime.make(ServicesAppUILive);

export const toSvelteKitLoad =
	<A>(self: Effect.Effect<A, never, ServicesAppUI | ServicesLoadUI>) =>
	(event: Kit.LoadEvent) =>
		self.pipe(Effect.provideService(SvelteKitLoadEvent, event), runtimeUI.runPromise);
