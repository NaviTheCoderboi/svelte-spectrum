import { DateFormatter } from '@internationalized/date';
import { useDeepMemo } from '@svelte-aria/utils';
import { useLocale } from './context/useLocale.svelte';

export interface DateFormatterOptions extends Intl.DateTimeFormatOptions {
    calendar?: string;
}

export const useDateFormatter = (options?: DateFormatterOptions): DateFormatter => {
    options = useDeepMemo(options ?? {}, isEqual);
    const { locale } = useLocale();
    return new DateFormatter(locale, options);
};

const isEqual = (a: DateFormatterOptions, b: DateFormatterOptions) => {
    if (a === b) {
        return true;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }

    for (const key of aKeys) {
        // @ts-expect-error - TS doesn't know that the key is a valid key of DateFormatterOptions
        if (b[key] !== a[key]) {
            return false;
        }
    }

    return true;
};
