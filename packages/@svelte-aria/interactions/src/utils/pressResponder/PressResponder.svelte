<script lang="ts">
    import { mergeProps,useSyncRef } from '@svelte-aria/utils';
    import { PressResponderContext } from './context.svelte';
    import type { Snippet } from 'svelte';
    import type { PressProps } from '../../hooks/usePress.svelte';
    import type { FocusableElement } from '@svelte-types/shared';

    let {
        children,
        ref = $bindable(),
        ...restProps
    }: PressProps<FocusableElement> & {
        children: Snippet;
        ref?: FocusableElement
    } = $props();

    let isRegistered = false;
    let prevContext = PressResponderContext.get();

    ref = ref ?? prevContext?.ref;

    let context = mergeProps(prevContext ?? {}, {
        ...restProps,
        ref,
        register: () => {
            isRegistered = true;
            if (prevContext?.register) {
                prevContext.register();
            }
        }
    });

    useSyncRef(PressResponderContext, ref);

    $effect(() => {
        if (!isRegistered) {
            console.warn(
                'A PressResponder was rendered without a pressable child. ' +
                'Either call the usePress hook, or wrap your DOM node with <Pressable> component.'
            );
            isRegistered = true;
        }
    });
    
    PressResponderContext.set(context)
</script>

{@render children()}