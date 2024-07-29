<script lang="ts">
    import { mergeProps } from '@svelte-aria/utils';
    import { usePress, type PressProps } from '../hooks/usePress.svelte';
    import type { Snippet } from 'svelte';
    import type { DOMAttributes, FocusableElement } from '@svelte-types/shared';

    const {
        children,
        ref = $bindable(),
        ...props
    }: PressProps & {
        children: Snippet<[PressProps & DOMAttributes]>,
        ref?: FocusableElement
    } = $props();

    const { pressProps } = usePress({ ...props, ref })

    const mergedProps = mergeProps(props, pressProps());
</script>

{@render children(mergedProps)}