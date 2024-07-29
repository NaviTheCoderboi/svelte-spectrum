import { useCollator } from './useCollator.svelte';

export interface Filter {
    startsWith(string: string, substring: string): boolean;
    endsWith(string: string, substring: string): boolean;
    contains(string: string, substring: string): boolean;
}

export const useFilter = (options?: Intl.CollatorOptions): Filter => {
    const collator = useCollator({
        usage: 'search',
        ...options
    });

    const startsWith = (string: string, substring: string) => {
        if (substring.length === 0) {
            return true;
        }

        string = string.normalize('NFC');
        substring = substring.normalize('NFC');
        return collator.compare(string.slice(0, substring.length), substring) === 0;
    };

    const endsWith = (string: string, substring: string) => {
        if (substring.length === 0) {
            return true;
        }

        string = string.normalize('NFC');
        substring = substring.normalize('NFC');
        return collator.compare(string.slice(-substring.length), substring) === 0;
    };

    const contains = (string: string, substring: string) => {
        if (substring.length === 0) {
            return true;
        }

        string = string.normalize('NFC');
        substring = substring.normalize('NFC');

        let scan = 0;
        const sliceLen = substring.length;
        for (; scan + sliceLen <= string.length; scan++) {
            const slice = string.slice(scan, scan + sliceLen);
            if (collator.compare(substring, slice) === 0) {
                return true;
            }
        }

        return false;
    };

    return {
        startsWith,
        endsWith,
        contains
    };
};
