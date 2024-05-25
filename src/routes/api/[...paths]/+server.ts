import { RouterTag } from '$lib/server/router.js';
import { runtimeServer, toSvelteKitRequestHandler } from '$lib/server/runtime-server.js';
import { Effect, pipe } from 'effect';

const handler = await pipe(
	RouterTag,
	Effect.map(toSvelteKitRequestHandler),
	runtimeServer.runPromise
);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
