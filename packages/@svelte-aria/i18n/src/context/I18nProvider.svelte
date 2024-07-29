<script lang="ts">
    import { useDefaultLocale } from '../useDefaultLocale.svelte';
    import { isRTL } from '../utils';
    import I18nContext, { type I18nProviderProps } from './context.svelte';

    const { locale, children }: I18nProviderProps = $props();

    const defaultLocale = useDefaultLocale();
    
    I18nContext.set({
        get direction() {
            return locale ? isRTL(locale) ? 'rtl' : 'ltr' : defaultLocale.direction;
        },
        get locale() {
            return locale ?? defaultLocale.locale;
        },
    });
</script>

{@render children()}