<script lang="ts">
    import { mergeProps } from '../mergeProps';
    import { useSyncRef } from '../hooks/useSyncRef.svelte';
    import { contextName, PressResponderContext } from './context.svelte';
    import { getContext, setContext, type Snippet } from 'svelte';
    import type { PressProps } from '../../hooks/usePress.svelte';
    import type { FocusableElement } from '../../shared/dom';
    import type { IPressResponderContext } from './context.svelte';

    let {
        children,
        ref = $bindable(),
        ...restProps
    }: PressProps<FocusableElement> & {
        children: Snippet;
        ref: FocusableElement;
    } = $props();

    let isRegistered = false;
    let prevContext = getContext<IPressResponderContext<FocusableElement>>(contextName) ?? PressResponderContext;

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

    useSyncRef(prevContext, ref);

    $effect(() => {
        if (!isRegistered) {
            console.warn(
                'A PressResponder was rendered without a pressable child. ' +
                    'Call the usePress hook'
            );
            isRegistered = true;
        }
    });

    setContext(contextName, context);
</script>

{@render children()}