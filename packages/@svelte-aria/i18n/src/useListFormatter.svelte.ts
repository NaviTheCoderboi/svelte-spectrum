import { useLocale } from './context/useLocale.svelte';

export function useListFormatter(options: Intl.ListFormatOptions = {}): Intl.ListFormat {
    const { locale } = useLocale();
    return new Intl.ListFormat(locale, options);
}
