export const useEffectEvent = <T extends (...args: any[]) => any>(fn?: T): T => {
    let ref: T | undefined | null = null;

    if (typeof document !== 'undefined') {
        $effect.pre(() => {
            ref = fn;
        });
    }

    return ((...args: any) => {
        const f = ref;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return f?.(...args);
    }) as T;
};
