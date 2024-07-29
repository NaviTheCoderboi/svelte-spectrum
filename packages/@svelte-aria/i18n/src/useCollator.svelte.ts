import { useLocale } from './context/useLocale.svelte';

const cache = new Map<string, Intl.Collator>();

export const useCollator = (options?: Intl.CollatorOptions): Intl.Collator => {
    const { locale } = useLocale();

    const cacheKey =
        locale +
        (options
            ? Object.entries(options)
                  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
                  .join()
            : '');
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    const formatter = new Intl.Collator(locale, options);
    cache.set(cacheKey, formatter);
    return formatter;
};
