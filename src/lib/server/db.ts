import * as Sqlite from '@effect/sql-sqlite-node';
import { Config, Effect, Layer } from 'effect';

export const makeDbLive = Effect.gen(function* () {});

export const DbLive = Sqlite.client
	.layer({
		filename: Config.succeed('db.sqlite')
	})
	.pipe(Layer.orDie);
