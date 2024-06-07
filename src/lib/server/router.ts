import { HttpServer } from '@effect/platform';
import { Router, Rpc } from '@effect/rpc';
import { HttpRouterNoStream } from '@effect/rpc-http';
import { Schema } from '@effect/schema';
import * as Sql from '@effect/sql';
import * as Sqlite from '@effect/sql-sqlite-node';
import { Context, Effect, Layer, flow } from 'effect';
import { CreateNote, GetNotes, Note, NoteError } from '../schema.js';
import { DbLive } from './db.js';
import { SvelteKitRequestEvent } from './svelte-kit-request-event.js';

export type RouterRpc = Router.Router<GetNotes | CreateNote, SvelteKitRequestEvent>;

export class RouterTag extends Context.Tag('Router')<
	RouterTag,
	Effect.Effect.Success<typeof makeRouter>
>() {}

export const makeRouter = Effect.gen(function* () {
	const sql = yield* Sqlite.client.SqliteClient;

	yield* sql`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, content TEXT)`;

	const routerRpc: RouterRpc = Router.make(
		Rpc.effect(
			GetNotes,
			flow(
				Sql.schema.findAll({
					Result: Note,
					Request: Schema.Unknown,
					execute: () => sql`SELECT * FROM notes`
				}),
				Effect.zipLeft(logIsOverNetwork),
				Effect.tapError(Effect.logError),
				Effect.mapError((_) => new NoteError({ message: _.message }))
			)
		),
		Rpc.effect(
			CreateNote,
			flow(
				Sql.schema.void({
					Request: Note,
					execute: (_) => sql`INSERT INTO notes ${sql.insert(_)}`
				}),
				Effect.zipLeft(logIsOverNetwork),
				Effect.tapError(Effect.logError),
				Effect.mapError((_) => new NoteError({ message: _.message }))
			)
		)
	);

	return HttpServer.router.empty.pipe(
		HttpServer.router.post('/rpc', HttpRouterNoStream.toHttpApp(routerRpc)),
		HttpServer.router.prefixAll('/api'),
		Effect.catchTags({
			RouteNotFound: () => HttpServer.response.text('Route Not Found', { status: 404 }),
			RequestError: () => HttpServer.response.text('Bad Request', { status: 400 }),
			ParseError: () => HttpServer.response.text('Bad Request', { status: 400 })
		})
	);
});

export const RouterLive = Layer.effect(RouterTag, makeRouter).pipe(
	Layer.provide(DbLive),
	Layer.orDie
);

const logIsOverNetwork = Effect.gen(function* () {
	const reqSvelteKit = yield* SvelteKitRequestEvent;
	const span = yield* Effect.currentSpan;
	yield* Effect.log(
		reqSvelteKit.isSubRequest
			? `Request from SvelteKit ${span.name}`
			: `Request from network ${span.name}`
	);
});
