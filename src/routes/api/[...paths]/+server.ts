import { makeRouter } from '$lib/server/api';
import { runtime, toSvelteKitHandler } from '$lib/server/runtime.js';
import { Effect, pipe } from 'effect';

const handler = await pipe(
	makeRouter,
	Effect.map(toSvelteKitHandler),
	Effect.orDie,
	runtime.runPromise
);

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
