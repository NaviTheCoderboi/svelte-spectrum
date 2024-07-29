import type { DOMAttributes, FocusableElement, SFocusEvent } from '@svelte-types/shared';
import { useSyntheticBlurEvent } from '../utils/syntheticFocusEvent.svelte';
import type { FocusEventHandler } from 'svelte/elements';

export interface FocusWithinProps<T extends FocusableElement = FocusableElement> {
    isDisabled?: boolean;
    onFocusWithin?: (e: SFocusEvent<T>) => void;
    onBlurWithin?: (e: SFocusEvent<T>) => void;
    onFocusWithinChange?: (isFocusWithin: boolean) => void;
}

export interface FocusWithinResult<T extends FocusableElement = FocusableElement> {
    focusWithinProps: DOMAttributes<T>;
}

export const useFocusWithin = <T extends FocusableElement = FocusableElement>(
    props: FocusWithinProps<T>
): FocusWithinResult => {
    const { isDisabled, onBlurWithin, onFocusWithin, onFocusWithinChange } = props;
    const state = {
        isFocusWithin: false
    };

    const onBlur = (e: SFocusEvent<T>) => {
        if (
            state.isFocusWithin &&
            !(e.currentTarget as Element).contains(e.relatedTarget as Element)
        ) {
            state.isFocusWithin = false;

            if (onBlurWithin) {
                onBlurWithin(e);
            }

            if (onFocusWithinChange) {
                onFocusWithinChange(false);
            }
        }
    };

    const onSyntheticFocus = useSyntheticBlurEvent(onBlur);
    const onFocus = (e: SFocusEvent<T>) => {
        if (!state.isFocusWithin && document.activeElement === e.target) {
            if (onFocusWithin) {
                onFocusWithin(e);
            }

            if (onFocusWithinChange) {
                onFocusWithinChange(true);
            }

            state.isFocusWithin = true;
            onSyntheticFocus(e);
        }
    };

    if (isDisabled) {
        return {
            focusWithinProps: {
                onfocus: undefined,
                onblur: undefined
            }
        };
    }

    return {
        focusWithinProps: {
            onfocusin: onFocus as unknown as FocusEventHandler<FocusableElement>,
            onfocusout: onBlur as unknown as FocusEventHandler<FocusableElement>
        }
    };
};
