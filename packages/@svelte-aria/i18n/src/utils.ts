const RTL_SCRIPTS = new Set([
    'Arab',
    'Syrc',
    'Samr',
    'Mand',
    'Thaa',
    'Mend',
    'Nkoo',
    'Adlm',
    'Rohg',
    'Hebr'
]);

const RTL_LANGS = new Set([
    'ae',
    'ar',
    'arc',
    'bcc',
    'bqi',
    'ckb',
    'dv',
    'fa',
    'glk',
    'he',
    'ku',
    'mzn',
    'nqo',
    'pnb',
    'ps',
    'sd',
    'ug',
    'ur',
    'yi'
]);

export function isRTL(localeString: string) {
    if (Intl.Locale) {
        const locale = new Intl.Locale(localeString).maximize();

        const textInfo =
            typeof locale.getTextInfo === 'function' ? locale.getTextInfo() : locale.textInfo;
        if (textInfo) {
            return textInfo.direction === 'rtl';
        }

        if (locale.script) {
            return RTL_SCRIPTS.has(locale.script);
        }
    }

    const lang = localeString.split('-')[0];
    return RTL_LANGS.has(lang);
}
