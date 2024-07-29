import type {
    DOMAttributes,
    FocusableElement,
    FocusEvents,
    SFocusEvent
} from '@svelte-types/shared';
import { useSyntheticBlurEvent } from '../utils/syntheticFocusEvent.svelte';
import { getOwnerDocument } from '@svelte-aria/utils';
import type { FocusEventHandler } from 'svelte/elements';

export interface FocusProps<T extends FocusableElement = FocusableElement> extends FocusEvents<T> {
    isDisabled?: boolean;
}

export interface FocusResult<T extends FocusableElement = FocusableElement> {
    focusProps: DOMAttributes<T>;
}

export const useFocus = <T extends FocusableElement = FocusableElement>(
    props: FocusProps<T>
): FocusResult<T> => {
    const { isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange } = props;

    const onBlur: FocusProps<T>['onBlur'] = $derived((e: SFocusEvent<T>) => {
        if (e.target === e.currentTarget) {
            if (onBlurProp) {
                onBlurProp(e);
            }

            if (onFocusChange) {
                onFocusChange(false);
            }

            return true;
        }
    });

    const onSyntheticFocus = useSyntheticBlurEvent<T>(onBlur);

    const onFocus: FocusProps<T>['onFocus'] = (e: SFocusEvent<T>) => {
        const ownerDocument = getOwnerDocument(e.target);

        if (e.target === e.currentTarget && ownerDocument.activeElement === e.target) {
            if (onFocusProp) {
                onFocusProp(e);
            }

            if (onFocusChange) {
                onFocusChange(true);
            }

            onSyntheticFocus(e);
        }
    };

    return {
        focusProps: {
            onfocus:
                !isDisabled && (onFocusProp || onFocusChange || onBlurProp)
                    ? (onFocus as unknown as FocusEventHandler<T>)
                    : undefined,
            onblur:
                !isDisabled && (onBlurProp || onFocusChange)
                    ? (onBlur as unknown as FocusEventHandler<T>)
                    : undefined
        }
    };
};
