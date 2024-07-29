import { isRTL } from './utils';
import type { Direction } from '@svelte-types/shared';

export interface Locale {
    locale: string;
    direction: Direction;
}

const localeSymbol = Symbol.for('svelte-aria.i18n.locale');

export function getDefaultLocale(): Locale {
    let locale =
        // @ts-expect-error - TS doesn't know about Symbol
        ((typeof window !== 'undefined' && window[localeSymbol]) ||
            (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) ||
            'en-US') as string;

    try {
        Intl.DateTimeFormat.supportedLocalesOf([locale]);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
        locale = 'en-US';
    }
    return {
        locale,
        direction: isRTL(locale) ? 'rtl' : 'ltr'
    };
}

let currentLocale = getDefaultLocale();
const listeners = new Set<(locale: Locale) => void>();

function updateLocale() {
    currentLocale = getDefaultLocale();
    for (const listener of listeners) {
        listener(currentLocale);
    }
}

export function useDefaultLocale(): Locale {
    const isSSR = typeof window === 'undefined';
    let defaultLocale = $state(currentLocale);

    const setDefaultLocale = (locale: Locale) => {
        defaultLocale = locale;
    };

    $effect(() => {
        if (listeners.size === 0) {
            window.addEventListener('languagechange', updateLocale);
        }

        listeners.add(setDefaultLocale);

        return () => {
            listeners.delete(setDefaultLocale);
            if (listeners.size === 0) {
                window.removeEventListener('languagechange', updateLocale);
            }
        };
    });

    if (isSSR) {
        return {
            locale: 'en-US',
            direction: 'ltr'
        };
    }

    return defaultLocale;
}
