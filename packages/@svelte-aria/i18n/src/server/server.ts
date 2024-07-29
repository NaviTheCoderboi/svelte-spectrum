import type { LocalizedString } from '@internationalized-svelte/string';

type PackageLocalizedStrings = Record<string, Record<string, LocalizedString>>;

export interface PackageLocalizationProviderProps {
    locale: string;
    strings: PackageLocalizedStrings;
    nonce?: string;
}

export const getPackageLocalizationScript = (locale: string, strings: PackageLocalizedStrings) => {
    return `window[Symbol.for('svelte-aria.i18n.locale')]=${JSON.stringify(locale)};{${serialize(strings)}}`;
};

const cache = new WeakMap<PackageLocalizedStrings, string>();

const serialize = (strings: PackageLocalizedStrings): string => {
    const cached = cache.get(strings);
    if (cached) {
        return cached;
    }

    const seen = new Set();
    const common = new Map();
    for (const pkg in strings) {
        for (const key in strings[pkg]) {
            const v = strings[pkg][key];
            const s = typeof v === 'string' ? JSON.stringify(v) : v.toString();
            if (seen.has(s) && !common.has(s)) {
                const name = String.fromCharCode(
                    common.size > 25 ? common.size + 97 : common.size + 65
                );
                common.set(s, name);
            }
            seen.add(s);
        }
    }

    let res = '';
    if (common.size > 0) {
        res += 'let ';
    }
    for (const [string, name] of common) {
        res += `${name}=${string},`;
    }
    if (common.size > 0) {
        res = res.slice(0, -1) + ';';
    }

    res += "window[Symbol.for('svelte-aria.i18n.strings')]={";
    for (const pkg in strings) {
        res += `'${pkg}':{`;
        for (const key in strings[pkg]) {
            const v = strings[pkg][key];
            let s = typeof v === 'string' ? JSON.stringify(v) : v.toString();
            if (common.has(s)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                s = common.get(s);
            }
            res += `${/[ ()]/.test(key) ? JSON.stringify(key) : key}:${s},`;
        }
        res = res.slice(0, -1) + '},';
    }
    res = res.slice(0, -1) + '};';
    cache.set(strings, res);
    return res;
};
