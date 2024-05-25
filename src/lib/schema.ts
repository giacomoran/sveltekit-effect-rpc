import { Schema } from '@effect/schema';
import { pipe } from 'effect';

export const NoteId = pipe(Schema.String, Schema.brand('NoteId'));

export class Note extends Schema.Class<Note>('Note')({
	id: NoteId,
	content: Schema.String
}) {}

export class NoteError extends Schema.TaggedError<NoteError>()('NoteError', {
	message: Schema.String
}) {}

export class GetNotes extends Schema.TaggedRequest<GetNotes>()(
	'GetNotes',
	NoteError,
	Schema.Array(Note),
	{}
) {}

export class CreateNote extends Schema.TaggedRequest<CreateNote>()(
	'CreateNote',
	NoteError,
	Schema.Void,
	{ id: NoteId, content: Schema.String }
) {}
