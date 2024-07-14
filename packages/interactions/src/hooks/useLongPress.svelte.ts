import type { DOMAttributes, LongPressEvent } from '@svelte-types/shared';

export interface LongPressProps {
    isDisabled?: boolean;
    onLongPressStart?: (e: LongPressEvent) => void;
    onLongPressEnd?: (e: LongPressEvent) => void;
    onLongPress?: (e: LongPressEvent) => void;
    threshold?: number;
    accessibilityDescription?: string;
}

export interface LongPressResult {
    longPressProps: DOMAttributes;
}
