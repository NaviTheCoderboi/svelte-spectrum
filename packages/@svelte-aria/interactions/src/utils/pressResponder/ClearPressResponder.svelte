<script lang="ts">
    import { PressResponderContext } from './context.svelte';
    import type { Snippet } from 'svelte';

    const context = {
        register: () => {},
    }

    PressResponderContext.set(context);

    let {
        children
    }: {
        children: Snippet
    } = $props();
</script>

{@render children()}