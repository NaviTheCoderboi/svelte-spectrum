import {
    type LocalizedStrings,
    MessageDictionary,
    MessageFormatter
} from '@internationalized/message';
import { useLocale } from './context/useLocale.svelte';

export type FormatMessage = (key: string, variables?: Record<string, any>) => string;

const cache = new WeakMap<LocalizedStrings, MessageDictionary>();

const getCachedDictionary = (strings: LocalizedStrings) => {
    let dictionary = cache.get(strings);
    if (!dictionary) {
        dictionary = new MessageDictionary(strings);
        cache.set(strings, dictionary);
    }

    return dictionary;
};

export const useMessageFormatter = (strings: LocalizedStrings): FormatMessage => {
    const { locale } = useLocale();
    const dictionary = getCachedDictionary(strings);
    const formatter = new MessageFormatter(locale, dictionary);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (key, variables) => formatter.format(key, variables);
};
