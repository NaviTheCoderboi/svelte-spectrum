import { useDefaultLocale, type Locale } from '../useDefaultLocale.svelte';
import I18nContext from './context.svelte';

export const useLocale = (): Locale => {
    const defaultLocate = useDefaultLocale();
    const context = I18nContext.get();

    return context ?? defaultLocate;
};
