import {
    type LocalizedString,
    LocalizedStringDictionary,
    LocalizedStringFormatter,
    type LocalizedStrings
} from '@internationalized-svelte/string';
import { useLocale } from './context/useLocale.svelte';

const cache = new WeakMap<any, any>();

const getCachedDictionary = <K extends string, T extends LocalizedString>(
    strings: LocalizedStrings<K, T>
): LocalizedStringDictionary<K, T> => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let dictionary = cache.get(strings);
    if (!dictionary) {
        dictionary = new LocalizedStringDictionary(strings);
        cache.set(strings, dictionary);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return dictionary;
};

export const useLocalizedStringDictionary = <
    K extends string = string,
    T extends LocalizedString = string
>(
    strings: LocalizedStrings<K, T>,
    packageName?: string
): LocalizedStringDictionary<K, T> => {
    return (
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        (packageName && LocalizedStringDictionary.getGlobalDictionaryForPackage(packageName)) ||
        getCachedDictionary(strings)
    );
};

export const useLocalizedStringFormatter = <
    K extends string = string,
    T extends LocalizedString = string
>(
    strings: LocalizedStrings<K, T>,
    packageName?: string
): LocalizedStringFormatter<K, T> => {
    const { locale } = useLocale();
    const dictionary = useLocalizedStringDictionary(strings, packageName);
    return new LocalizedStringFormatter(locale, dictionary);
};
