import type {
    DOMAttributes,
    FocusableElement,
    LongPressEvent,
    PressEvent
} from '@svelte-types/shared';
import { usePress } from './usePress.svelte';
import { mergeProps, useDescription, useGlobalListeners } from '@svelte-aria/utils';

export interface LongPressProps<T extends FocusableElement = FocusableElement> {
    isDisabled?: boolean;
    onLongPressStart?: (e: LongPressEvent<T>) => void;
    onLongPressEnd?: (e: LongPressEvent<T>) => void;
    onLongPress?: (e: LongPressEvent<T>) => void;
    threshold?: number;
    accessibilityDescription?: string;
}

export interface LongPressResult<T extends FocusableElement = FocusableElement> {
    longPressProps: () => DOMAttributes<T>;
}

const DEFAULT_THRESHOLD = 500;

export const useLongPress = <T extends FocusableElement = FocusableElement>(
    props: LongPressProps<T>
): LongPressResult<T> => {
    const {
        isDisabled,
        onLongPressStart,
        onLongPressEnd,
        onLongPress,
        threshold = DEFAULT_THRESHOLD,
        accessibilityDescription
    } = props;

    let timeRef: ReturnType<typeof setTimeout> | undefined = undefined;
    const { addGlobalListener, removeGlobalListener } = useGlobalListeners();

    const { pressProps } = usePress({
        isDisabled,
        onPressStart: (e) => {
            e.continuePropagation();

            if (e.pointerType === 'mouse' || e.pointerType === 'touch') {
                if (onLongPressStart) {
                    onLongPressStart({
                        ...(e as PressEvent<T>),
                        type: 'longpressstart'
                    });
                }

                timeRef = setTimeout(() => {
                    e.target.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
                    if (onLongPress) {
                        onLongPress({
                            ...(e as PressEvent<T>),
                            type: 'longpress'
                        });
                    }
                    timeRef = undefined;
                }, threshold);

                if (e.pointerType === 'touch') {
                    const onContextMenu = (e: MouseEvent) => {
                        e.preventDefault();
                    };

                    addGlobalListener(e.target, 'contextmenu', onContextMenu, { once: true });
                    addGlobalListener(
                        window,
                        'pointerup',
                        () => {
                            setTimeout(() => {
                                removeGlobalListener(e.target, 'contextmenu', onContextMenu);
                            }, 30);
                        },
                        { once: true }
                    );
                }
            }
        },
        onPressEnd: (e) => {
            if (timeRef) {
                clearTimeout(timeRef);
            }

            if (onLongPressEnd && (e.pointerType === 'mouse' || e.pointerType === 'touch')) {
                onLongPressEnd({
                    ...(e as PressEvent<T>),
                    type: 'longpressend'
                });
            }
        }
    });

    const descriptionProps = useDescription(
        onLongPress && !isDisabled ? accessibilityDescription : undefined
    );

    return {
        longPressProps: () => mergeProps(pressProps(), descriptionProps)
    };
};
