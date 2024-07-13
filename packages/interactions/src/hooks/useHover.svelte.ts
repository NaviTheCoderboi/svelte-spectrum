import type { DOMAttributes } from '../shared/dom';
import type { PointerType, HoverEvents } from '../shared/events';

export interface HoverProps<T extends Element = Element> extends HoverEvents<T> {
    isDisabled?: boolean;
}

export interface HoverResult<T extends Element = Element> {
    hoverProps: () => DOMAttributes<T>;
    isHovered: () => boolean;
}

let globalIgnoreEmulatedMouseEvents = false;
let hoverCount = 0;

const setGlobalIgnoreEmulatedMouseEvents = () => {
    globalIgnoreEmulatedMouseEvents = true;

    setTimeout(() => {
        globalIgnoreEmulatedMouseEvents = false;
    }, 50);
};

const handleGlobalPointerEvent = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
        setGlobalIgnoreEmulatedMouseEvents();
    }
};

const setupGlobalTouchEvents = () => {
    if (typeof document === 'undefined') return;

    if (typeof PointerEvent !== 'undefined') {
        document.addEventListener('pointerup', handleGlobalPointerEvent);
    } else {
        document.addEventListener('touchend', setGlobalIgnoreEmulatedMouseEvents);
    }

    hoverCount++;

    return () => {
        hoverCount--;

        if (hoverCount > 0) return;

        if (typeof PointerEvent !== 'undefined') {
            document.removeEventListener('pointerup', handleGlobalPointerEvent);
        } else {
            document.removeEventListener('touchend', setGlobalIgnoreEmulatedMouseEvents);
        }
    };
};

export const useHover = <T extends Element = Element>(props: HoverProps = {}): HoverResult<T> => {
    const { onHoverStart, onHoverEnd, onHoverChange, isDisabled } = props;

    let isHovered = $state(false);
    const state = $state<{
        isHovered: boolean;
        ignoreEmulatedMouseEvents: boolean;
        pointerType: PointerType;
        target: (EventTarget & T) | null;
    }>({
        isHovered: false,
        ignoreEmulatedMouseEvents: false,
        pointerType: '' as PointerType,
        target: null
    });

    $effect(setupGlobalTouchEvents);

    const { hoverProps, triggerHoverEnd } = $derived.by(() => {
        const triggerHoverStart = (
            event: MouseEvent & {
                currentTarget: EventTarget & T;
            },
            pointerType: PointerType
        ) => {
            state.pointerType = pointerType;
            if (
                isDisabled ||
                pointerType === 'touch' ||
                state.isHovered ||
                !event.currentTarget.contains(event.target as Node)
            ) {
                return;
            }

            state.isHovered = true;
            const target = event.currentTarget;
            state.target = target;

            if (onHoverStart) {
                onHoverStart({
                    type: 'hoverstart',
                    target,
                    pointerType
                });
            }

            if (onHoverChange) {
                onHoverChange(true);
            }

            isHovered = true;
        };

        const triggerHoverEnd = (
            event: MouseEvent & {
                currentTarget: EventTarget & T;
            },
            pointerType: PointerType
        ) => {
            state.pointerType = '' as PointerType;
            state.target = null;

            if (pointerType === 'touch' || !state.isHovered) return;

            state.isHovered = false;

            const target = event.currentTarget;

            if (onHoverEnd) {
                onHoverEnd({
                    type: 'hoverend',
                    target,
                    pointerType
                });
            }

            if (onHoverChange) {
                onHoverChange(false);
            }

            isHovered = false;
        };

        const hoverProps: DOMAttributes<T> = {};

        if (typeof PointerEvent !== 'undefined') {
            hoverProps.onpointerenter = (e) => {
                if (globalIgnoreEmulatedMouseEvents && e.pointerType === 'mouse') {
                    return;
                }

                triggerHoverStart(e, e.pointerType as PointerType);
            };

            hoverProps.onpointerleave = (e) => {
                if (!isDisabled && e.currentTarget.contains(e.target as Element)) {
                    triggerHoverEnd(e, e.pointerType as PointerType);
                }
            };
        } else {
            hoverProps.ontouchstart = () => {
                state.ignoreEmulatedMouseEvents = true;
            };

            hoverProps.onmouseenter = (e) => {
                if (!state.ignoreEmulatedMouseEvents && !globalIgnoreEmulatedMouseEvents) {
                    triggerHoverStart(e, 'mouse');
                }

                state.ignoreEmulatedMouseEvents = false;
            };

            hoverProps.onmouseleave = (e) => {
                if (!isDisabled && e.currentTarget.contains(e.target as Element)) {
                    triggerHoverEnd(e, 'mouse');
                }
            };
        }

        return {
            hoverProps,
            triggerHoverEnd
        };
    });

    $effect(() => {
        if (isDisabled) {
            // @ts-expect-error - ignore it for now
            triggerHoverEnd({ currentTarget: state.target }, state.pointerType);
        }
    });

    return {
        isHovered: () => isHovered,
        hoverProps: () => hoverProps
    };
};
