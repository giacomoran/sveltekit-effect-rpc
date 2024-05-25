// Mostly copied from https://gist.github.com/mikearnaldi/b255f52afbbeb003026c3ce26acf124a

import { HttpServer } from '@effect/platform';
import { Schema } from '@effect/schema';
import * as Sql from '@effect/sql';
import * as Sqlite from '@effect/sql-sqlite-node';
import { Console, Effect } from 'effect';

class Note extends Schema.Class<Note>('Note')({
	id: Schema.String,
	content: Schema.String
}) {}
const Notes = Schema.Array(Note);

const NotesPayload = Schema.Struct({ id: Schema.String, content: Schema.String });
const NoteParams = Schema.Struct({ id: Schema.String });

export const makeRouter = Effect.gen(function* () {
	const sql = yield* Sqlite.client.SqliteClient;

	yield* sql`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, content TEXT UNIQUE)`;

	const noteById = Sql.schema.single({
		Result: Note,
		Request: NoteParams,
		execute: ({ id }) => sql`SELECT * FROM notes WHERE id = ${id}`
	});

	const deleteNoteById = Sql.schema.void({
		Request: NoteParams,
		execute: ({ id }) => sql`DELETE FROM notes WHERE id = ${id}`
	});

	return HttpServer.router.empty.pipe(
		HttpServer.router.post(
			'/notes',
			HttpServer.request.schemaBodyJson(NotesPayload).pipe(
				Effect.flatMap((_) => sql`INSERT INTO notes ${sql.insert(_)}`),
				Effect.flatMap(() => sql`SELECT * FROM notes`),
				Effect.flatMap(Schema.decodeUnknown(Notes)),
				Effect.tapError(Console.error),
				Effect.flatMap((notes) => HttpServer.response.schemaJson(Notes)(notes, { status: 201 })),
				Effect.catchAll(() => HttpServer.response.text('Error creating note', { status: 500 }))
			)
		),
		HttpServer.router.get(
			'/notes/:id',
			HttpServer.router.schemaPathParams(NoteParams).pipe(
				Effect.flatMap(noteById),
				Effect.tapError(Console.error),
				Effect.flatMap(HttpServer.response.schemaJson(Note)),
				Effect.catchAll(() => HttpServer.response.text('Error getting note', { status: 500 }))
			)
		),
		HttpServer.router.get(
			'/notes',
			sql`SELECT * FROM notes`.pipe(
				Effect.flatMap(Schema.decodeUnknown(Notes)),
				Effect.flatMap(HttpServer.response.schemaJson(Notes)),
				Effect.catchAll(() => HttpServer.response.text('Error getting notes', { status: 500 }))
			)
		),
		HttpServer.router.del(
			'/notes/:id',
			HttpServer.router.schemaPathParams(NoteParams).pipe(
				Effect.flatMap(deleteNoteById),
				Effect.tapError(Console.error),
				Effect.zipRight(HttpServer.response.text('Note deleted successfully')),
				Effect.catchAll(() => HttpServer.response.text('Error deleting note', { status: 500 }))
			)
		),
		HttpServer.router.del(
			'/notes',
			sql`DELETE FROM notes`.pipe(
				Effect.zipRight(HttpServer.response.text('Notes deleted successfully')),
				Effect.catchAll(() => HttpServer.response.text('Error deleting notes', { status: 500 }))
			)
		),
		HttpServer.router.prefixAll('/api'),
		Effect.catchTag('RouteNotFound', () =>
			HttpServer.response.text('Route Not Found', { status: 404 })
		)
	);
});
