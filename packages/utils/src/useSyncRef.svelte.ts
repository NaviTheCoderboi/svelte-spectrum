interface ContextValue<T> {
    ref?: T | null;
}

export const useSyncRef = <T>(context?: ContextValue<T> | null, ref?: T | null) => {
    if (typeof document !== 'undefined') {
        $effect.pre(() => {
            if (context && context.ref && ref) {
                context.ref = ref;

                return () => {
                    context.ref = null;
                };
            }
        });
    }
};
