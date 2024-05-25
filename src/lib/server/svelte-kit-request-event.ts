import type * as Kit from '@sveltejs/kit';
import { Context } from 'effect';

export class SvelteKitRequestEvent extends Context.Tag('SvelteKitRequestEvent')<
	SvelteKitRequestEvent,
	Kit.RequestEvent
>() {}
