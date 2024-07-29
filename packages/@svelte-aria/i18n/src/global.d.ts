declare namespace Intl {
    interface Locale {
        getTextInfo?: () => {
            direction: 'ltr' | 'rtl';
        };
        textInfo?: {
            direction: 'ltr' | 'rtl';
        };
    }
}

declare interface Navigator {
    userLanguage?: string;
}

declare global {
    interface Window {
        [localeSymbol]: string;
    }
}
