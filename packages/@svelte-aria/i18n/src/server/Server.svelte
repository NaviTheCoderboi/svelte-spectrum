<script lang="ts">
    import type { getPackageLocalizationScript, PackageLocalizationProviderProps } from './server';

    if (typeof document !== 'undefined') {
        console.log('PackageLocalizationProvider should only be rendered on the server.');
    }

    let { nonce, locale, strings }: PackageLocalizationProviderProps = $props();

    let _nonce = typeof window === 'undefined' ? nonce : '';
</script>

<svelte:head>
    <script nonce={_nonce}>
        {
            getPackageLocalizationScript(locale, strings);
        }
    </script>
</svelte:head>
