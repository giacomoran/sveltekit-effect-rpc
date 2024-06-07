# SvelteKit & @effect/rpc

SvelteKit app where the API is implemented using @effect/rpc. Includes OTEL tracing.

## Implementation notes

Use `routes/api/[...paths]` to create multiple API endpoints simultaneously, the handler is derived from an Effect HTTP `App`.

In load functions, SvelteKit provides a custom `event.fetch`. Among other things, during SSR it skips network calls to internal APIs and avoids refetching data on the client.
Use the `HttpClient.client.Fetch` `Tag` to provide `event.fetch` to Effect.

### Hack to avoid refetching on the client

@effect/rpc batches multiple RPC requests in a single HTTP request. The body of the HTTP request is the array of RPC request bodies, which are JSON objects.
For tracing, each RPC request is assigned separate trace ID and span ID (the HTTP request is also assigned a separate trace ID and span ID).

This is incompatible with SvelteKit `event.fetch` caching during SSR. On the server, `event.fetch` caches responses in the HTML; during hydration, `event.fetch` retrieves the responses from the HTML cache.
The problem is that the cache key is the hash of the request header and body. The HTTP request body includes each RPC's trace ID and span ID, which differ between SSR and hydration, resulting in cache misses.

To solve this problem we introduce the custom `X-SvelteKit-Hash` header and patch SvelteKit to use its value as cache key. The value of the header is the hash of the request header and body, omitting trace IDs and span IDs.

## Refs

- [Using Hono with SvelteKit - Full type-safety with RPC](https://dev.to/bop/using-hono-with-sveltekit-full-type-safety-with-rpc-2h7)
- [README for @effect/platform](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)
- [mikearnaldi/refactor.ts](https://gist.github.com/mikearnaldi/b255f52afbbeb003026c3ce26acf124a)
- [SvelteKit docs - Advanced routing](https://kit.svelte.dev/docs/advanced-routing)
- [SvelteKit docs - Loading data - Making fetch requests](https://dev.to/bop/using-hono-with-sveltekit-full-type-safety-with-rpc-2h7)
