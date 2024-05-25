import type * as Kit from '@sveltejs/kit';
import { Context } from 'effect';

export class SvelteKitLoadEvent extends Context.Tag('SvelteKitLoadEvent')<
	SvelteKitLoadEvent,
	Kit.LoadEvent
>() {}
