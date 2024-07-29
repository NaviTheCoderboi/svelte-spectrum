type LocalizedStrings<K extends string, T extends LocalizedString> = Record<string, Record<K, T>>;
declare class LocalizedStringDictionary<K extends string = string, T extends LocalizedString = string> {
    private strings;
    private defaultLocale;
    constructor(messages: LocalizedStrings<K, T>, defaultLocale?: string);
    getStringForLocale(key: K, locale: string): T;
    getStringsForLocale(locale: string): Record<K, T>;
    static getGlobalDictionaryForPackage<K extends string = string, T extends LocalizedString = string>(packageName: string): LocalizedStringDictionary<K, T> | null;
}

type Variables = Record<string, string | number | boolean> | undefined;
type LocalizedString = string | ((args: Variables, formatter?: LocalizedStringFormatter<any, any>) => string);
type InternalString = string | (() => string);
declare class LocalizedStringFormatter<K extends string = string, T extends LocalizedString = string> {
    private locale;
    private strings;
    constructor(locale: string, strings: LocalizedStringDictionary<K, T>);
    format(key: K, variables?: Variables): string;
    protected plural(count: number, options: Record<string, InternalString>, type?: Intl.PluralRuleType): string;
    protected number(value: number): string;
    protected select(options: Record<string, InternalString>, value: string): string;
}

export { type LocalizedString, LocalizedStringDictionary, LocalizedStringFormatter, type LocalizedStrings, type Variables };
