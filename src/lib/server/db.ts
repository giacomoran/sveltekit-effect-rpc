import * as Sqlite from '@effect/sql-sqlite-node';
import { Config, Layer } from 'effect';

export const DbLive = Sqlite.client
	.layer({
		filename: Config.string('DATABASE_FILE')
	})
	.pipe(Layer.orDie);
