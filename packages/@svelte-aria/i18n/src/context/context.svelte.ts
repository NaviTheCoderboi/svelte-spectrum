import { createContext } from 'svelte-contextify';
import type { Locale } from '../useDefaultLocale.svelte';
import type { Snippet } from 'svelte';

export interface I18nProviderProps {
    children: Snippet;
    locale?: string;
}

const I18nContext = createContext<Locale | null>({
    defaultValue: null
});

export default I18nContext;
