import { disableTextSelection, restoreTextSelection } from '../utils/textSelection';
import { PressResponderContext } from '../utils/pressResponder/context.svelte';
import {
    mergeProps,
    useSyncRef,
    useEffectEvent,
    useGlobalListeners,
    getOwnerDocument,
    getOwnerWindow,
    openLink,
    isVirtualClick,
    isVirtualPointerEvent,
    focusWithoutScrolling,
    chain,
    isMac
} from '@svelte-aria/utils';
import type {
    FocusableElement,
    DOMAttributes,
    PressEvents,
    PointerType,
    PressEvent as IPressEvent
} from '@svelte-types/shared';

export interface PressProps<T extends FocusableElement = FocusableElement> extends PressEvents<T> {
    isPressed?: boolean;
    isDisabled?: boolean;
    preventFocusOnPress?: boolean;
    shouldCancelOnPointerExit?: boolean;
    allowTextSelectionOnPress?: boolean;
}

export interface PressHookProps<T extends FocusableElement = FocusableElement>
    extends PressProps<T> {
    ref?: T | null;
}

export interface PressState {
    isPressed: boolean;
    ignoreEmulatedMouseEvents: boolean;
    ignoreClickAfterPress: boolean;
    didFirePressStart: boolean;
    isTriggeringEvent: boolean;
    activePointerId: any;
    target: FocusableElement | null;
    isOverTarget: boolean;
    pointerType: PointerType | null;
    userSelect?: string;
    metaKeyEvents?: Map<string, KeyboardEvent>;
}

export interface EventBase {
    currentTarget: EventTarget | null;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    clientX?: number;
    clientY?: number;
    targetTouches?: { clientX?: number; clientY?: number }[];
}

export interface PressResult<T extends Element = Element> {
    isPressed: () => boolean;
    pressProps: () => DOMAttributes<T>;
}

const usePressResponderContext = <T extends FocusableElement = FocusableElement>(
    props: PressHookProps<T>
): PressHookProps<T> => {
    const context = PressResponderContext.get();

    if (context) {
        const { register, ...contextProps } = context;

        props = mergeProps(contextProps, props) as PressHookProps<T>;

        register();
    }

    useSyncRef(PressResponderContext, props.ref as FocusableElement | undefined | null);

    return props;
};

class PressEvent<T extends FocusableElement> implements IPressEvent<T> {
    type: IPressEvent['type'];
    pointerType: PointerType;
    target: T;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    x: number;
    y: number;
    #shouldStopPropagation = true;

    constructor(
        type: IPressEvent['type'],
        pointerType: PointerType,
        originalEvent: EventBase,
        state?: PressState
    ) {
        const currentTarget = state?.target ?? originalEvent.currentTarget;
        const rect: DOMRect | undefined = (currentTarget as Element)?.getBoundingClientRect();
        let x = 0;
        let y = 0;
        let clientX: number | null = null;
        let clientY: number | null = null;
        if (originalEvent.clientX != null && originalEvent.clientY != null) {
            clientX = originalEvent.clientX;
            clientY = originalEvent.clientY;
        }

        if (rect) {
            if (clientX != null && clientY != null) {
                x = clientX - rect.left;
                y = clientY - rect.top;
            } else {
                x = rect.width / 2;
                y = rect.height / 2;
            }
        }

        this.type = type;
        this.pointerType = pointerType;
        this.target = originalEvent.currentTarget as T;
        this.shiftKey = originalEvent.shiftKey;
        this.metaKey = originalEvent.metaKey;
        this.ctrlKey = originalEvent.ctrlKey;
        this.altKey = originalEvent.altKey;
        this.x = x;
        this.y = y;
    }

    continuePropagation(): void {
        this.#shouldStopPropagation = false;
    }

    get shouldStopPropagation(): boolean {
        return this.#shouldStopPropagation;
    }
}

const LINK_CLICKED = Symbol('linkClicked');

export const usePress = <T extends FocusableElement>(
    props: PressHookProps<T> = {}
): PressResult<T> => {
    const {
        onPress,
        onPressChange,
        onPressStart,
        onPressEnd,
        onPressUp,
        isDisabled,
        isPressed: isPressedProp,
        preventFocusOnPress,
        shouldCancelOnPointerExit,
        allowTextSelectionOnPress,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ref: _,
        ...domProps
    } = usePressResponderContext(props);

    let isPressed = $state(false);
    const ref: PressState = {
        isPressed: false,
        ignoreEmulatedMouseEvents: false,
        ignoreClickAfterPress: false,
        didFirePressStart: false,
        isTriggeringEvent: false,
        activePointerId: null,
        target: null,
        isOverTarget: false,
        pointerType: null
    };

    const { addGlobalListener, removeAllGlobalListeners } = useGlobalListeners();

    const triggerPressStart = useEffectEvent(
        (originalEvent: EventBase, pointerType: PointerType) => {
            const state = ref;
            if (isDisabled || state.didFirePressStart) {
                return false;
            }

            let shouldStopPropagation = true;
            state.isTriggeringEvent = true;
            if (onPressStart) {
                const event = new PressEvent<T>('pressstart', pointerType, originalEvent);
                onPressStart(event);
                shouldStopPropagation = event.shouldStopPropagation;
            }

            if (onPressChange) {
                onPressChange(true);
            }

            state.isTriggeringEvent = false;
            state.didFirePressStart = true;
            isPressed = true;
            return shouldStopPropagation;
        }
    );

    const triggerPressEnd = useEffectEvent(
        (originalEvent: EventBase, pointerType: PointerType, wasPressed = true) => {
            const state = ref;
            if (!state.didFirePressStart) {
                return false;
            }

            state.ignoreClickAfterPress = true;
            state.didFirePressStart = false;
            state.isTriggeringEvent = true;

            let shouldStopPropagation = true;
            if (onPressEnd) {
                const event = new PressEvent<T>('pressend', pointerType, originalEvent);
                onPressEnd(event);
                shouldStopPropagation = event.shouldStopPropagation;
            }

            if (onPressChange) {
                onPressChange(false);
            }

            isPressed = false;

            if (onPress && wasPressed && !isDisabled) {
                const event = new PressEvent<T>('press', pointerType, originalEvent);
                onPress(event);
                shouldStopPropagation &&= event.shouldStopPropagation;
            }

            state.isTriggeringEvent = false;
            return shouldStopPropagation;
        }
    );

    const triggerPressUp = useEffectEvent((originalEvent: EventBase, pointerType: PointerType) => {
        const state = ref;
        if (isDisabled) {
            return false;
        }

        if (onPressUp) {
            state.isTriggeringEvent = true;
            const event = new PressEvent<T>('pressup', pointerType, originalEvent);
            onPressUp(event);
            state.isTriggeringEvent = false;
            return event.shouldStopPropagation;
        }

        return true;
    });

    const cancel = useEffectEvent((e: EventBase) => {
        const state = ref;
        if (state.isPressed && state.target) {
            if (state.isOverTarget && state.pointerType != null) {
                triggerPressEnd(createEvent(state.target, e), state.pointerType, false);
            }
            state.isPressed = false;
            state.isOverTarget = false;
            state.activePointerId = null;
            state.pointerType = null;
            removeAllGlobalListeners();
            if (!allowTextSelectionOnPress) {
                restoreTextSelection(state.target);
            }
        }
    });

    const cancelOnPointerExit = useEffectEvent((e: EventBase) => {
        if (shouldCancelOnPointerExit) {
            cancel(e);
        }
    });

    const pressProps = $derived.by(() => {
        const state = ref;
        const pressProps: DOMAttributes<T> = {
            onkeydown(e) {
                if (
                    isValidKeyboardEvent(e, e.currentTarget) &&
                    e.currentTarget.contains(e.target as T)
                ) {
                    if (shouldPreventDefaultKeyboard(e.target as Element, e.key)) {
                        e.preventDefault();
                    }

                    let shouldStopPropagation = true;
                    if (!state.isPressed && !e.repeat) {
                        state.target = e.currentTarget;
                        state.isPressed = true;
                        shouldStopPropagation = triggerPressStart(e, 'keyboard');

                        const originalTarget = e.currentTarget;
                        const pressUp = (
                            e: KeyboardEvent & {
                                currentTarget: EventTarget & T;
                            }
                        ) => {
                            if (
                                isValidKeyboardEvent(e, originalTarget) &&
                                !e.repeat &&
                                originalTarget.contains(e.target as Element) &&
                                state.target
                            ) {
                                triggerPressUp(createEvent(state.target, e), 'keyboard');
                            }
                        };

                        addGlobalListener(
                            getOwnerDocument(e.currentTarget),
                            'keyup',
                            chain(pressUp, onKeyUp),
                            true
                        );
                    }

                    if (shouldStopPropagation) {
                        e.stopPropagation();
                    }

                    if (e.metaKey && isMac()) {
                        state.metaKeyEvents?.set(e.key, e);
                    }
                } else if (e.key === 'Meta') {
                    state.metaKeyEvents = new Map();
                }
            },
            onclick(e) {
                if (e && !e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (
                    e &&
                    e.button === 0 &&
                    !state.isTriggeringEvent &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    !(openLink as any).isOpening
                ) {
                    let shouldStopPropagation = true;
                    if (isDisabled) {
                        e.preventDefault();
                    }

                    if (
                        !state.ignoreClickAfterPress &&
                        !state.ignoreEmulatedMouseEvents &&
                        !state.isPressed &&
                        (state.pointerType === 'virtual' || isVirtualClick(e))
                    ) {
                        if (!isDisabled && !preventFocusOnPress) {
                            focusWithoutScrolling(e.currentTarget);
                        }

                        const stopPressStart = triggerPressStart(e, 'virtual');
                        const stopPressUp = triggerPressUp(e, 'virtual');
                        const stopPressEnd = triggerPressEnd(e, 'virtual');
                        shouldStopPropagation = stopPressStart && stopPressUp && stopPressEnd;
                    }

                    state.ignoreEmulatedMouseEvents = false;
                    state.ignoreClickAfterPress = false;
                    if (shouldStopPropagation) {
                        e.stopPropagation();
                    }
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (state.isPressed && state.target && isValidKeyboardEvent(e, state.target)) {
                if (shouldPreventDefaultKeyboard(e.target as Element, e.key)) {
                    e.preventDefault();
                }

                const target = e.target as Element;
                triggerPressEnd(
                    createEvent(state.target, e),
                    'keyboard',
                    state.target.contains(target)
                );
                removeAllGlobalListeners();

                if (
                    e.key !== 'Enter' &&
                    isHTMLAnchorLink(state.target) &&
                    state.target.contains(target) &&
                    // @ts-expect-error - ignore it for now
                    !e[LINK_CLICKED]
                ) {
                    // @ts-expect-error - ignore it for now
                    e[LINK_CLICKED] = true;
                    openLink(state.target, e, false);
                }

                state.isPressed = false;
                state.metaKeyEvents?.delete(e.key);
            } else if (e.key === 'Meta' && state.metaKeyEvents?.size) {
                const events = state.metaKeyEvents;
                state.metaKeyEvents = undefined;
                for (const event of events.values()) {
                    state.target?.dispatchEvent(new KeyboardEvent('keyup', event));
                }
            }
        };

        if (typeof PointerEvent !== 'undefined') {
            pressProps.onpointerdown = (e) => {
                if (e.button !== 0 || !e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (isVirtualPointerEvent(e)) {
                    state.pointerType = 'virtual';
                    return;
                }

                if (shouldPreventDefault(e.currentTarget as Element)) {
                    e.preventDefault();
                }

                state.pointerType = e.pointerType as PointerType;

                let shouldStopPropagation = true;
                if (!state.isPressed) {
                    state.isPressed = true;
                    state.isOverTarget = true;
                    state.activePointerId = e.pointerId;
                    state.target = e.currentTarget;

                    if (!isDisabled && !preventFocusOnPress) {
                        focusWithoutScrolling(e.currentTarget);
                    }

                    if (!allowTextSelectionOnPress) {
                        disableTextSelection(state.target);
                    }

                    shouldStopPropagation = triggerPressStart(e, state.pointerType);

                    addGlobalListener(
                        getOwnerDocument(e.currentTarget),
                        'pointermove',
                        onPointerMove,
                        false
                    );
                    addGlobalListener(
                        getOwnerDocument(e.currentTarget),
                        'pointerup',
                        onPointerUp,
                        false
                    );
                    addGlobalListener(
                        getOwnerDocument(e.currentTarget),
                        'pointercancel',
                        onPointerCancel,
                        false
                    );
                }

                if (shouldStopPropagation) {
                    e.stopPropagation();
                }
            };

            pressProps.onmousedown = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (e.button === 0) {
                    if (shouldPreventDefault(e.currentTarget as Element)) {
                        e.preventDefault();
                    }

                    e.stopPropagation();
                }
            };

            pressProps.onpointerup = (e) => {
                if (
                    !e.currentTarget.contains(e.target as Element) ||
                    state.pointerType === 'virtual'
                ) {
                    return;
                }

                if (e.button === 0 && isOverTarget(e, e.currentTarget)) {
                    triggerPressUp(e, state.pointerType ?? (e.pointerType as PointerType));
                }
            };

            const onPointerMove = (e: PointerEvent) => {
                if (e.pointerId !== state.activePointerId) {
                    return;
                }

                if (state.target && isOverTarget(e, state.target)) {
                    if (!state.isOverTarget && state.pointerType != null) {
                        state.isOverTarget = true;
                        triggerPressStart(createEvent(state.target, e), state.pointerType);
                    }
                } else if (state.target && state.isOverTarget && state.pointerType != null) {
                    state.isOverTarget = false;
                    triggerPressEnd(createEvent(state.target, e), state.pointerType, false);
                    cancelOnPointerExit(e);
                }
            };

            const onPointerUp = (e: PointerEvent) => {
                if (
                    e.pointerId === state.activePointerId &&
                    state.isPressed &&
                    e.button === 0 &&
                    state.target
                ) {
                    if (isOverTarget(e, state.target) && state.pointerType != null) {
                        triggerPressEnd(createEvent(state.target, e), state.pointerType);
                    } else if (state.isOverTarget && state.pointerType != null) {
                        triggerPressEnd(createEvent(state.target, e), state.pointerType, false);
                    }

                    state.isPressed = false;
                    state.isOverTarget = false;
                    state.activePointerId = null;
                    state.pointerType = null;
                    removeAllGlobalListeners();
                    if (!allowTextSelectionOnPress) {
                        restoreTextSelection(state.target);
                    }
                }
            };

            const onPointerCancel = (e: PointerEvent) => {
                cancel(e);
            };

            pressProps.ondragstart = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }
                cancel(e);
            };
        } else {
            pressProps.onmousedown = (e) => {
                if (e.button !== 0 || !e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (shouldPreventDefault(e.currentTarget)) {
                    e.preventDefault();
                }

                if (state.ignoreEmulatedMouseEvents) {
                    e.stopPropagation();
                    return;
                }

                state.isPressed = true;
                state.isOverTarget = true;
                state.target = e.currentTarget;
                state.pointerType = isVirtualClick(e) ? 'virtual' : 'mouse';

                if (!isDisabled && !preventFocusOnPress) {
                    focusWithoutScrolling(e.currentTarget);
                }

                const shouldStopPropagation = triggerPressStart(e, state.pointerType);
                if (shouldStopPropagation) {
                    e.stopPropagation();
                }

                addGlobalListener(getOwnerDocument(e.currentTarget), 'mouseup', onMouseUp, false);
            };

            pressProps.onmouseenter = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                let shouldStopPropagation = true;
                if (
                    state.isPressed &&
                    !state.ignoreEmulatedMouseEvents &&
                    state.pointerType != null
                ) {
                    state.isOverTarget = true;
                    shouldStopPropagation = triggerPressStart(e, state.pointerType);
                }

                if (shouldStopPropagation) {
                    e.stopPropagation();
                }
            };

            pressProps.onmouseleave = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                let shouldStopPropagation = true;
                if (
                    state.isPressed &&
                    !state.ignoreEmulatedMouseEvents &&
                    state.pointerType != null
                ) {
                    state.isOverTarget = false;
                    shouldStopPropagation = triggerPressEnd(e, state.pointerType, false);
                    cancelOnPointerExit(e);
                }

                if (shouldStopPropagation) {
                    e.stopPropagation();
                }
            };

            pressProps.onmouseup = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (!state.ignoreEmulatedMouseEvents && e.button === 0) {
                    triggerPressUp(e, state.pointerType ?? 'mouse');
                }
            };

            const onMouseUp = (e: MouseEvent) => {
                if (e.button !== 0) {
                    return;
                }

                state.isPressed = false;
                removeAllGlobalListeners();

                if (state.ignoreEmulatedMouseEvents) {
                    state.ignoreEmulatedMouseEvents = false;
                    return;
                }

                if (state.target && isOverTarget(e, state.target) && state.pointerType != null) {
                    triggerPressEnd(createEvent(state.target, e), state.pointerType);
                } else if (state.target && state.isOverTarget && state.pointerType != null) {
                    triggerPressEnd(createEvent(state.target, e), state.pointerType, false);
                }

                state.isOverTarget = false;
            };

            pressProps.ontouchstart = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                const touch = getTouchFromEvent(e);
                if (!touch) {
                    return;
                }
                state.activePointerId = touch.identifier;
                state.ignoreEmulatedMouseEvents = true;
                state.isOverTarget = true;
                state.isPressed = true;
                state.target = e.currentTarget;
                state.pointerType = 'touch';

                if (!isDisabled && !preventFocusOnPress) {
                    focusWithoutScrolling(e.currentTarget);
                }

                if (!allowTextSelectionOnPress) {
                    disableTextSelection(state.target);
                }

                const shouldStopPropagation = triggerPressStart(
                    createTouchEvent(state.target, e),
                    state.pointerType
                );
                if (shouldStopPropagation) {
                    e.stopPropagation();
                }

                addGlobalListener(getOwnerWindow(e.currentTarget), 'scroll', onScroll, true);
            };

            pressProps.ontouchmove = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (!state.isPressed) {
                    e.stopPropagation();
                    return;
                }

                const touch = getTouchById(e, state.activePointerId);
                let shouldStopPropagation = true;
                if (touch && isOverTarget(touch, e.currentTarget)) {
                    if (!state.isOverTarget && state.pointerType != null) {
                        state.isOverTarget = true;
                        shouldStopPropagation = triggerPressStart(
                            createTouchEvent(state.target!, e),
                            state.pointerType
                        );
                    }
                } else if (state.isOverTarget && state.pointerType != null) {
                    state.isOverTarget = false;
                    shouldStopPropagation = triggerPressEnd(
                        createTouchEvent(state.target!, e),
                        state.pointerType,
                        false
                    );
                    cancelOnPointerExit(createTouchEvent(state.target!, e));
                }

                if (shouldStopPropagation) {
                    e.stopPropagation();
                }
            };

            pressProps.ontouchend = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                if (!state.isPressed) {
                    e.stopPropagation();
                    return;
                }

                const touch = getTouchById(e, state.activePointerId);
                let shouldStopPropagation = true;
                if (touch && isOverTarget(touch, e.currentTarget) && state.pointerType != null) {
                    triggerPressUp(createTouchEvent(state.target!, e), state.pointerType);
                    shouldStopPropagation = triggerPressEnd(
                        createTouchEvent(state.target!, e),
                        state.pointerType
                    );
                } else if (state.isOverTarget && state.pointerType != null) {
                    shouldStopPropagation = triggerPressEnd(
                        createTouchEvent(state.target!, e),
                        state.pointerType,
                        false
                    );
                }

                if (shouldStopPropagation) {
                    e.stopPropagation();
                }

                state.isPressed = false;
                state.activePointerId = null;
                state.isOverTarget = false;
                state.ignoreEmulatedMouseEvents = true;
                if (state.target && !allowTextSelectionOnPress) {
                    restoreTextSelection(state.target);
                }
                removeAllGlobalListeners();
            };

            pressProps.ontouchcancel = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                e.stopPropagation();
                if (state.isPressed) {
                    cancel(createTouchEvent(state.target!, e));
                }
            };

            const onScroll = (e: Event) => {
                if (state.isPressed && (e.target as Element).contains(state.target)) {
                    cancel({
                        currentTarget: state.target,
                        shiftKey: false,
                        ctrlKey: false,
                        metaKey: false,
                        altKey: false
                    });
                }
            };

            pressProps.ondragstart = (e) => {
                if (!e.currentTarget.contains(e.target as Element)) {
                    return;
                }

                cancel(e);
            };
        }

        return pressProps;
    });

    $effect(() => {
        return () => {
            if (!allowTextSelectionOnPress) {
                restoreTextSelection(ref.target ?? undefined);
            }
        };
    });

    return {
        isPressed: () => isPressedProp ?? isPressed,
        pressProps: () => mergeProps(domProps, pressProps)
    };
};

const createTouchEvent = (target: FocusableElement, e: TouchEvent): EventBase => {
    let clientX = 0;
    let clientY = 0;
    if (e.targetTouches && e.targetTouches.length === 1) {
        clientX = e.targetTouches[0].clientX;
        clientY = e.targetTouches[0].clientY;
    }
    return {
        currentTarget: target,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        clientX,
        clientY
    };
};

const createEvent = (target: FocusableElement, e: EventBase): EventBase => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    return {
        currentTarget: target,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        clientX,
        clientY
    };
};

const isValidKeyboardEvent = (event: KeyboardEvent, currentTarget: Element): boolean => {
    const { key, code } = event;
    const element = currentTarget as HTMLElement;
    const role = element.getAttribute('role');
    return (
        (key === 'Enter' || key === ' ' || key === 'Spacebar' || code === 'Space') &&
        !(
            (element instanceof getOwnerWindow(element).HTMLInputElement &&
                !isValidInputKey(element, key)) ||
            element instanceof getOwnerWindow(element).HTMLTextAreaElement ||
            element.isContentEditable
        ) &&
        !((role === 'link' || (!role && isHTMLAnchorLink(element))) && key !== 'Enter')
    );
};

const nonTextInputTypes = new Set([
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'image',
    'button',
    'submit',
    'reset'
]);

const isValidInputKey = (target: HTMLInputElement, key: string) => {
    return target.type === 'checkbox' || target.type === 'radio'
        ? key === ' '
        : nonTextInputTypes.has(target.type);
};

const isHTMLAnchorLink = (target: Element): target is HTMLAnchorElement => {
    return target.tagName === 'A' && target.hasAttribute('href');
};

const shouldPreventDefaultKeyboard = (target: Element, key: string) => {
    if (target instanceof HTMLInputElement) {
        return !isValidInputKey(target, key);
    }

    if (target instanceof HTMLButtonElement) {
        return target.type !== 'submit' && target.type !== 'reset';
    }

    if (isHTMLAnchorLink(target)) {
        return false;
    }

    return true;
};

const shouldPreventDefault = (target: Element) => {
    return !(target instanceof HTMLElement) || !target.hasAttribute('draggable');
};

interface Rect {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface EventPoint {
    clientX: number;
    clientY: number;
    width?: number;
    height?: number;
    radiusX?: number;
    radiusY?: number;
}

const getPointClientRect = (point: EventPoint): Rect => {
    let offsetX = 0;
    let offsetY = 0;
    if (point.width !== undefined) {
        offsetX = point.width / 2;
    } else if (point.radiusX !== undefined) {
        offsetX = point.radiusX;
    }
    if (point.height !== undefined) {
        offsetY = point.height / 2;
    } else if (point.radiusY !== undefined) {
        offsetY = point.radiusY;
    }

    return {
        top: point.clientY - offsetY,
        right: point.clientX + offsetX,
        bottom: point.clientY + offsetY,
        left: point.clientX - offsetX
    };
};

const areRectanglesOverlapping = (a: Rect, b: Rect) => {
    if (a.left > b.right || b.left > a.right) {
        return false;
    }
    if (a.top > b.bottom || b.top > a.bottom) {
        return false;
    }
    return true;
};

const isOverTarget = (point: EventPoint, target: Element) => {
    const rect = target.getBoundingClientRect();
    const pointRect = getPointClientRect(point);
    return areRectanglesOverlapping(rect, pointRect);
};

const getTouchFromEvent = (event: TouchEvent): Touch | null => {
    const { targetTouches } = event;
    if (targetTouches.length > 0) {
        return targetTouches[0];
    }
    return null;
};

const getTouchById = (event: TouchEvent, pointerId: null | number): null | Touch => {
    const changedTouches = event.changedTouches;
    for (const touch of changedTouches) {
        if (touch.identifier === pointerId) {
            return touch;
        }
    }
    return null;
};
