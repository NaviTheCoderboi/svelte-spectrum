import type { LocalizedStringDictionary } from './LocalizedStringDictionary';

export type Variables = Record<string, string | number | boolean> | undefined;
export type LocalizedString =
    | string
    | ((args: Variables, formatter?: LocalizedStringFormatter<any, any>) => string);
type InternalString = string | (() => string);

const pluralRulesCache = new Map<string, Intl.PluralRules>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();

export class LocalizedStringFormatter<
    K extends string = string,
    T extends LocalizedString = string
> {
    private locale: string;
    private strings: LocalizedStringDictionary<K, T>;

    constructor(locale: string, strings: LocalizedStringDictionary<K, T>) {
        this.locale = locale;
        this.strings = strings;
    }

    format(key: K, variables?: Variables): string {
        const message = this.strings.getStringForLocale(key, this.locale);
        return typeof message === 'function' ? message(variables, this) : message;
    }

    protected plural(
        count: number,
        options: Record<string, InternalString>,
        type: Intl.PluralRuleType = 'cardinal'
    ) {
        let opt = options['=' + count];
        if (opt) {
            return typeof opt === 'function' ? opt() : opt;
        }

        const key = this.locale + ':' + type;
        let pluralRules = pluralRulesCache.get(key);
        if (!pluralRules) {
            pluralRules = new Intl.PluralRules(this.locale, { type });
            pluralRulesCache.set(key, pluralRules);
        }

        const selected = pluralRules.select(count);
        opt = options[selected] || options.other;
        return typeof opt === 'function' ? opt() : opt;
    }

    protected number(value: number) {
        let numberFormat = numberFormatCache.get(this.locale);
        if (!numberFormat) {
            numberFormat = new Intl.NumberFormat(this.locale);
            numberFormatCache.set(this.locale, numberFormat);
        }
        return numberFormat.format(value);
    }

    protected select(options: Record<string, InternalString>, value: string) {
        const opt = options[value] || options.other;
        return typeof opt === 'function' ? opt() : opt;
    }
}
