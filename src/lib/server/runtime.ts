/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpServer } from '@effect/platform';
import * as Sqlite from '@effect/sql-sqlite-node';

import { PRIVATE_DATABASE_FILE } from '$env/static/private';
import * as Kit from '@sveltejs/kit';
import type { Scope } from 'effect';
import { Cause, Config, ConfigProvider, Effect, Exit, Layer, ManagedRuntime } from 'effect';
import { SvelteKitError, SvelteKitRedirect, SvelteKitRequest } from './svelte-kit';

export type ServicesApp = Sqlite.client.SqliteClient;
export type ServicesRequest = SvelteKitRequest;

type SvelteKitHttpApp = HttpServer.app.Default<
	SvelteKitError | SvelteKitRedirect,
	ServicesApp | ServicesRequest | Scope.Scope
>;

const provider = ConfigProvider.fromMap(new Map([['DATABASE_FILE', PRIVATE_DATABASE_FILE]]));
const DbLive = Sqlite.client.layer({ filename: Config.string('DATABASE_FILE') }).pipe(Layer.orDie);
const ServicesAppLive: Layer.Layer<ServicesApp> = Layer.mergeAll(DbLive).pipe(
	Layer.provide(Layer.setConfigProvider(provider))
);
export const runtime = ManagedRuntime.make(ServicesAppLive);

// Adapted from toWebHandlerRuntime https://github.com/Effect-TS/effect/blob/c23b142/packages/platform/src/Http/App.ts#L134-L135
const resolveSymbol = Symbol();
const rejectSymbol = Symbol();
// prettier-ignore
export const toSvelteKitHandler =
	(
		self: SvelteKitHttpApp,
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

        const SvelteKitRequestLive = Layer.succeed(SvelteKitRequest, { locals: event.locals, isSubRequest: event.isSubRequest });
        const ServicesRequestLive: Layer.Layer<ServicesRequest> = Layer.mergeAll(SvelteKitRequestLive);

        const fiber = runtime.runFork(handled.pipe(
          Effect.provideService(HttpServer.request.ServerRequest, req),
          Effect.provide(ServicesRequestLive),
        ))
        event.request.signal.addEventListener("abort", () => {
          fiber.unsafeInterruptAsFork(HttpServer.error.clientAbortFiberId)
        }, { once: true })
      })
  }

// #: load

// export const load =
// 	<A>(effect: Effect.Effect<A, Error | Redirect, App | Request | Scope.Scope>) =>
// 	(event: Kit.ServerLoadEvent) =>
// 		pipe(
// 			effect,
// 			// TODO: This is likely wrong, multiple `load` are called in the same
// 			// request. The scope should be the request.
// 			Effect.scoped,
// 			Effect.provide(event.locals.LiveRequest),
// 			Effect.tapErrorTag('RuntimeAPI/Error', (_) => Effect.logError(_.messageLog)),
// 			Effect.tapErrorTag('RuntimeAPI/Redirect', (_) => Effect.log(_.messageLog)),
// 			Effect.withSpan('RuntimeAPI/load'),
// 			Effect.either,
// 			runtime.runPromise
// 		).then(
// 			Either.match({
// 				onRight: identity,
// 				onLeft: Match.valueTags({
// 					'RuntimeAPI/Error': (_) => Kit.error(_.status, _.message),
// 					'RuntimeAPI/Redirect': (_) => Kit.redirect(_.status, _.location)
// 				})
// 			})
// 		);
