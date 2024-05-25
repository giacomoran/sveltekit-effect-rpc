import { Context, Data } from 'effect';

export class SvelteKitRequest extends Context.Tag('SvelteKitRequest')<
	SvelteKitRequest,
	{
		readonly locals: App.Locals;
		readonly isSubRequest: boolean;
		// ...
	}
>() {}

export class SvelteKitError extends Data.TaggedError('SvelteKitError')<{
	readonly status: number;
	readonly message: string;
}> {
	get messageLog() {
		return `Error status=${this.status} message="${this.message}"`;
	}
}
export class SvelteKitRedirect extends Data.TaggedError('SvelteKitRedirect')<{
	readonly status: number;
	readonly location: string | URL;
}> {
	get messageLog() {
		return `Redirect status=${this.status} location=${this.location.toString()}`;
	}
}
