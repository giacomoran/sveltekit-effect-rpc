<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let noteInput = '';

	const createNote = async () => {
		void data.createNote({ content: noteInput });
		noteInput = '';
	};
</script>

<form on:submit={createNote}>
	<input
		value={noteInput}
		on:input={(e) => (noteInput = e.currentTarget.value)}
		placeholder="Write a note..."
	/>

	<button>Add</button>
</form>

<ul>
	{#each data.notes as note (note.id)}
		<li>[{note.id}] {note.content}</li>
	{/each}
</ul>
