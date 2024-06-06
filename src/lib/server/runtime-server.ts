/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpServer } from '@effect/platform';
import * as Sqlite from '@effect/sql-sqlite-node';

import * as Kit from '@sveltejs/kit';
import type { Scope } from 'effect';
import { Cause, Effect, Exit, Layer, ManagedRuntime } from 'effect';
import { DbLive } from './db.js';
import { RouterLive, type RouterTag } from './router.js';
import { SvelteKitRequestEvent } from './svelte-kit-request-event.js';
import { TracingLive } from './tracing.js';

export type ServicesAppServer = RouterTag | Sqlite.client.SqliteClient;
export type ServicesRequestServer = SvelteKitRequestEvent;

const ServicesAppServerLive: Layer.Layer<ServicesAppServer> = Layer.mergeAll(
	RouterLive,
	DbLive,
	TracingLive
);

export const runtimeServer = ManagedRuntime.make(ServicesAppServerLive);

// Adapted from toWebHandlerRuntime https://github.com/Effect-TS/effect/blob/c23b142/packages/platform/src/Http/App.ts#L134-L135
const resolveSymbol = Symbol();
const rejectSymbol = Symbol();
// prettier-ignore
export const toSvelteKitRequestHandler =
	(
		self: HttpServer.app.Default<never, ServicesAppServer | ServicesRequestServer | Scope.Scope>,
	): Kit.RequestHandler => {
    const handled = Effect.scoped(HttpServer.app.toHandled(self, (request, exit) => {
      const webRequest = request.source as Request
      if (Exit.isSuccess(exit)) {
        ;(request as any)[resolveSymbol](HttpServer.response.toWeb(exit.value, request.method === "HEAD"))
      } else if (Cause.isInterruptedOnly(exit.cause)) {
        ;(request as any)[resolveSymbol](new Response(null, { status: webRequest.signal.aborted ? 499 : 503 }))
      } else {
        ;(request as any)[rejectSymbol](Cause.pretty(exit.cause))
      }
      return Effect.void
    }))
    return (event) =>
      new Promise((resolve, reject) => {
        const req = HttpServer.request.fromWeb(event.request)
        ;(req as any)[resolveSymbol] = resolve
        ;(req as any)[rejectSymbol] = reject

        const SvelteKitRequestLive = Layer.succeed(SvelteKitRequestEvent, event);
        const ServicesRequestLive: Layer.Layer<ServicesRequestServer> = Layer.mergeAll(SvelteKitRequestLive);

        const fiber = runtimeServer.runFork(handled.pipe(
          Effect.provideService(HttpServer.request.ServerRequest, req),
          Effect.provide(ServicesRequestLive),
        ))
        event.request.signal.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(HttpServer.error.clientAbortFiberId)
        }, { once: true })
      })
  }
