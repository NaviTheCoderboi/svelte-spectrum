<script lang="ts">
    import type { Snippet } from 'svelte';

    let {
        children,
        id
    }: {
        children?: Snippet | null;
        id: string;
    } = $props();
</script>

{#if children}
    <div style="z-index: -100; position: fixed; top: 0; left: -100000px;" id={id} aria-hidden="true">
        {@render children()}
    </div>
{/if}