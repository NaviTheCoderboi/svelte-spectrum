<script lang="ts">
    import { setContext, type Snippet } from 'svelte';
    import { contextName, setPressResponderContext } from './context.svelte';

    const context = {
        register: () => {},
    }

    setPressResponderContext(context);
    setContext(contextName, context);

    let {
        children
    }: {
        children: Snippet
    } = $props();
</script>

{@render children()}