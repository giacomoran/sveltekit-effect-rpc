import { invalidateAll } from '$app/navigation';
import { ClientTag } from '$lib/client.js';
import { toSvelteKitLoad } from '$lib/runtime-ui.js';
import { CreateNote, GetNotes, Note, NoteId } from '$lib/schema.js';
import { Effect, Runtime } from 'effect';
import type { PageLoad } from './$types';

export interface DataPage {
	readonly notes: ReadonlyArray<Note>;
	readonly createNote: (args: { content: string }) => Promise<void>;
}

export const load: PageLoad<DataPage> = toSvelteKitLoad(
	Effect.gen(function* () {
		const client = yield* ClientTag;
		const runtime = yield* Effect.runtime();

		const notes = yield* client(new GetNotes());

		const createNote = (args: { content: string }) =>
			Effect.gen(function* () {
				const id = Math.random().toString(36).slice(2, 6) as typeof NoteId.Type;
				yield* client(new CreateNote({ id, ...args }));
				// Force SvelteKit to re-run all `load` functions client-side
				yield* Effect.promise(() => invalidateAll());
			}).pipe(Runtime.runPromise(runtime));

		return { notes, createNote };
	}).pipe(
		Effect.catchTags({
			NoteError: (_) => Effect.dieMessage(_.message)
		})
	)
);
