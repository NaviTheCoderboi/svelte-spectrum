import { type NumberFormatOptions, NumberFormatter } from '@internationalized/number';
import { useLocale } from './context/useLocale.svelte';

export const useNumberFormatter = (options: NumberFormatOptions = {}): Intl.NumberFormat => {
    const { locale } = useLocale();
    return new NumberFormatter(locale, options);
};
