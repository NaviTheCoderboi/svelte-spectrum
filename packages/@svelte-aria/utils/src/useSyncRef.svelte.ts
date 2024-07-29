import type { Context } from 'svelte-contextify';

interface ContextValue<T> {
    ref?: T | null;
}

export const useSyncRef = <T, F extends ContextValue<T>>(context?: Context<F>, ref?: T | null) => {
    const get = context?.get();
    if (typeof document !== 'undefined') {
        $effect.pre(() => {
            if (context && get?.ref && ref) {
                context.set({
                    ...get,
                    ref
                });

                return () => {
                    context.set({
                        ...get,
                        ref: null
                    });
                };
            }
        });
    }
};
