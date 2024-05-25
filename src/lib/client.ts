import { browser } from '$app/environment';
import { HttpClient } from '@effect/platform';
import { Resolver } from '@effect/rpc';
import { HttpResolver } from '@effect/rpc-http';
import { Context, Effect, Layer, Option } from 'effect';
import type { RouterRpc } from './server/router.js';
import { SvelteKitLoadEvent } from './svelte-kit-load-event.js';

export class ClientTag extends Context.Tag('Client')<
	ClientTag,
	Effect.Effect.Success<typeof makeClient>
>() {}

export const makeClient = Effect.sync(() => {
	const clientHttp = HttpClient.client.fetchOk.pipe(
		HttpClient.client.mapRequestEffect((request) =>
			Effect.gen(function* () {
				const event = yield* Effect.serviceOption(SvelteKitLoadEvent);
				if (Option.isNone(event) && !browser) {
					yield* Effect.dieMessage('Invoked RPC from outside load event in SSR');
				}
				return Option.match(event, {
					onNone: () => request.pipe(HttpClient.request.prependUrl('/api/rpc')),
					onSome: (_) => request.pipe(HttpClient.request.prependUrl(new URL('/api/rpc', _.url)))
				});
			})
		),
		HttpClient.client.transformResponse((effect) =>
			Effect.gen(function* () {
				const event = yield* Effect.serviceOption(SvelteKitLoadEvent);
				if (Option.isNone(event) && !browser) {
					yield* Effect.dieMessage('Invoked RPC from outside load event in SSR');
				}
				return yield* Option.match(event, {
					onNone: () => effect,
					onSome: (_) => effect.pipe(Effect.provideService(HttpClient.client.Fetch, _.fetch))
				});
			})
		)
	);

	return HttpResolver.make<RouterRpc>(clientHttp).pipe(Resolver.toClient);
});

export const ClientLive = Layer.effect(ClientTag, makeClient);
