# SvelteKit + `@effect/rcp`

SvelteKit app where:

- API endpoints are created using Effect's `Router`.
- The API is implemented using `@effect/rpc`.
- During SSR, HTTP calls are skipped when RPCs are called.

## Notes

- Use `routes/api/[...paths]` to create multiple API endpoints simultaneously.
- SvelteKit's custom `fetch` skips HTTP calls during SSR. Pass it to Effect using the `HttpClient.client.Fetch` Tag.

## Refs

- [Using Hono with SvelteKit - Full type-safety with RPC](https://dev.to/bop/using-hono-with-sveltekit-full-type-safety-with-rpc-2h7)
- [README for @effect/platform](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)
- [mikearnaldi/refactor.ts](https://gist.github.com/mikearnaldi/b255f52afbbeb003026c3ce26acf124a)
- [SvelteKit docs - Advanced routing](https://kit.svelte.dev/docs/advanced-routing)
- [SvelteKit docs - Loading data - Making fetch requests](https://dev.to/bop/using-hono-with-sveltekit-full-type-safety-with-rpc-2h7)
