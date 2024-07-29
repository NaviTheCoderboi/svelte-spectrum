<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children
	}: {
		children: Snippet;
	} = $props();

	console.log(children);
</script>

<!-- {@render children()} -->
