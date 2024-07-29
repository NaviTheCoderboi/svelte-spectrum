import type { LocalizedString } from './LocalizedStringFormatter';

export type LocalizedStrings<K extends string, T extends LocalizedString> = Record<
    string,
    Record<K, T>
>;

const localeSymbol = Symbol.for('svelte-aria.i18n.locale');
const stringsSymbol = Symbol.for('svelte-aria.i18n.strings');
let cachedGlobalStrings: Record<string, LocalizedStringDictionary<any, any>> | null | undefined =
    undefined;

export class LocalizedStringDictionary<
    K extends string = string,
    T extends LocalizedString = string
> {
    private strings: LocalizedStrings<K, T>;
    private defaultLocale: string;

    constructor(messages: LocalizedStrings<K, T>, defaultLocale = 'en-US') {
        this.strings = Object.fromEntries(Object.entries(messages).filter(([, v]) => v));
        this.defaultLocale = defaultLocale;
    }

    getStringForLocale(key: K, locale: string): T {
        const strings = this.getStringsForLocale(locale);
        const string = strings[key];
        if (!string) {
            throw new Error(`Could not find intl message ${key} in ${locale} locale`);
        }

        return string;
    }

    getStringsForLocale(locale: string): Record<K, T> {
        let strings = this.strings[locale];
        if (!strings) {
            strings = getStringsForLocale(locale, this.strings, this.defaultLocale);
            this.strings[locale] = strings;
        }

        return strings;
    }

    static getGlobalDictionaryForPackage<
        K extends string = string,
        T extends LocalizedString = string
    >(packageName: string): LocalizedStringDictionary<K, T> | null {
        if (typeof window === 'undefined') {
            return null;
        }

        // @ts-expect-error - TS doesn't know about Symbol
        const locale = window[localeSymbol] as string;
        if (cachedGlobalStrings === undefined) {
            // @ts-expect-error - TS doesn't know about Symbol
            const globalStrings = window[stringsSymbol] as LocalizedStrings<K, T>;
            if (!globalStrings) {
                return null;
            }

            cachedGlobalStrings = {};
            for (const pkg in globalStrings) {
                cachedGlobalStrings[pkg] = new LocalizedStringDictionary(
                    { [locale]: globalStrings[pkg] },
                    locale
                );
            }
        }

        const dictionary = cachedGlobalStrings?.[packageName];
        if (!dictionary) {
            throw new Error(
                `Strings for package "${packageName}" were not included by LocalizedStringProvider. Please add it to the list passed to createLocalizedStringDictionary.`
            );
        }

        return dictionary;
    }
}

function getStringsForLocale<K extends string, T extends LocalizedString>(
    locale: string,
    strings: LocalizedStrings<K, T>,
    defaultLocale = 'en-US'
) {
    if (strings[locale]) {
        return strings[locale];
    }

    const language = getLanguage(locale);
    if (strings[language]) {
        return strings[language];
    }

    for (const key in strings) {
        if (key.startsWith(language + '-')) {
            return strings[key];
        }
    }

    return strings[defaultLocale];
}

function getLanguage(locale: string) {
    if (Intl.Locale) {
        return new Intl.Locale(locale).language;
    }

    return locale.split('-')[0];
}
