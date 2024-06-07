/* eslint-disable @typescript-eslint/no-explicit-any */
import { browser } from '$app/environment';
import { HttpClient } from '@effect/platform';
import { Resolver, ResolverNoStream, Router, Rpc } from '@effect/rpc';
import type { Serializable } from '@effect/schema';
import { Array, Context, Effect, Layer, Option, Record, RequestResolver, pipe } from 'effect';
import type { RouterRpc } from './server/router.js';
import { SvelteKitLoadEvent } from './svelte-kit-load-event.js';

/**
 * Copied and modified from `HttpResolverNoStream.make`:
 * https://github.com/Effect-TS/effect/blob/3f28bf2/packages/rpc-http/src/HttpResolverNoStream.ts#L20
 * Added support for SvelteKit, during load (server-side and client-side):
 * - Prepend host path to requests URL:
 *   In the browser `globalThis.URL` allows relative paths, in Node.js it does
 *   not. We take the host path from SvelteKit's `LoadEvent` and prepend it to
 *   the request URL.
 * - Add X-SvelteKit-Hash header:
 *   This is a hack to avoid refetching on the client in server-side rendered
 *   pages, see README.
 * - Use SvelteKit custom `fetch` function instead of `globalThis.fetch`:
 *   The custom `fetch` function:
 *   - skips the network call for internal requests (to +server.ts endpoints)
 *   - avoids refetching on the client in server-side rendered pages
 *   - more, see https://kit.svelte.dev/docs/load#making-fetch-requests
 */
export const makeHttpResolverNoStreamSvelteKit = <R extends Router.Router<any, any>>(
	client: HttpClient.client.Client.Default
): RequestResolver.RequestResolver<
	Rpc.Request<Router.Router.Request<R>>,
	Serializable.SerializableWithResult.Context<Router.Router.Request<R>>
> =>
	ResolverNoStream.make((requests) =>
		Effect.gen(function* () {
			const event = yield* Effect.serviceOption(SvelteKitLoadEvent);
			if (Option.isNone(event) && !browser) {
				yield* Effect.dieMessage('Invoked RPC from outside load event in SSR');
			}

			const clientSvelteKit = client.pipe(
				// Prepend host path to requests URL
				HttpClient.client.mapRequest((request) =>
					Option.match(event, {
						onNone: () => request,
						onSome: (_) => request.pipe(HttpClient.request.prependUrl(_.url.toString()))
					})
				),
				// Add X-SvelteKit-Hash header
				// Copied and modified from SvelteKit: https://github.com/sveltejs/kit/blob/0a0e9aa/packages/kit/src/runtime/client/fetcher.js#L164
				HttpClient.client.mapRequest((request) => {
					const values: Array<StrictBody> = [];

					values.push([...new globalThis.Headers(request.headers)].join(','));

					const requestsNoTracing = Array.map(requests, (_) => {
						if (typeof _ !== 'object' && _ === null) return _;
						return pipe(
							_ as Record<string, unknown>,
							Record.remove('traceId'),
							Record.remove('spanId')
						);
					});
					values.push(HttpClient.body.unsafeJson(requestsNoTracing).body);

					return request.pipe(
						HttpClient.request.setHeader('X-SvelteKit-Hash', hashSvelteKit(...values))
					);
				}),
				// Use SvelteKit custom `fetch` function instead of `globalThis.fetch`
				HttpClient.client.transform((effect) =>
					Option.match(event, {
						onNone: () => effect,
						onSome: (_) => effect.pipe(Effect.provideService(HttpClient.client.Fetch, _.fetch))
					})
				)
			);

			return yield* clientSvelteKit(
				HttpClient.request.post('', {
					body: HttpClient.body.unsafeJson(requests)
				})
			).pipe(
				Effect.flatMap((_) => _.json),
				Effect.scoped
			);
		})
	)<R>();

export class ClientTag extends Context.Tag('Client')<ClientTag, typeof client>() {}

export const client = makeHttpResolverNoStreamSvelteKit<RouterRpc>(
	HttpClient.client.fetchOk.pipe(
		HttpClient.client.mapRequest(HttpClient.request.prependUrl('/api/rpc'))
	)
).pipe(Resolver.toClient);

export const ClientLive = Layer.succeed(ClientTag, client);

/**
 * Copied from SvelteKit: https://github.com/sveltejs/kit/blob/0a0e9aa/packages/kit/src/types/internal.d.ts#L428
 */
type StrictBody = string | ArrayBufferView;

/**
 * Hash using djb2
 * Copied from SvelteKit: https://github.com/sveltejs/kit/blob/0a0e9aa/packages/kit/src/runtime/hash.js
 * Note that we cannot use Effect's `Hash.hash` because it is not deterministic
 * across runtimes.
 */
export function hashSvelteKit(...values: StrictBody[]) {
	let hash = 5381;

	for (const value of values) {
		if (typeof value === 'string') {
			let i = value.length;
			while (i) hash = (hash * 33) ^ value.charCodeAt(--i);
		} else if (ArrayBuffer.isView(value)) {
			const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
			let i = buffer.length;
			while (i) hash = (hash * 33) ^ buffer[--i];
		} else {
			throw new TypeError('value must be a string or TypedArray');
		}
	}

	return (hash >>> 0).toString(36);
}
