import type { FocusableElement } from './dom';

export type BaseEvent<T extends Event> = T & {
    /**
     * Use continuePropagation.
     * @deprecated */
    stopPropagation(): void;
    continuePropagation(): void;
};

export type PointerType = 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual';

export type SFocusEvent<T extends FocusableElement = FocusableElement> = FocusEvent & {
    target: EventTarget & T;
};

export interface FocusEvents<T extends FocusableElement = FocusableElement> {
    onFocus?: (e: SFocusEvent<T>) => void;
    onBlur?: (e: SFocusEvent<T>) => void;
    onFocusChange?: (isFocused: boolean) => void;
}

export interface LongPressEvent<T extends FocusableElement = FocusableElement>
    extends Omit<PressEvent<T>, 'type' | 'continuePropagation'> {
    type: 'longpressstart' | 'longpressend' | 'longpress';
}

export interface HoverEvent<T extends Element = Element> {
    type: 'hoverstart' | 'hoverend';
    pointerType: PointerType;
    target: T;
}

export interface HoverEvents<T extends Element = Element> {
    onHoverStart?: (event: HoverEvent<T>) => void;
    onHoverEnd?: (event: HoverEvent<T>) => void;
    onHoverChange?: (isHovered: boolean) => void;
}

export interface PressEvent<T extends FocusableElement = FocusableElement> {
    type: 'pressstart' | 'pressend' | 'pressup' | 'press';
    pointerType: PointerType;
    target: T;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    x: number;
    y: number;
    continuePropagation: () => void;
}

export interface PressEvents<T extends FocusableElement = FocusableElement> {
    onPress?: (event: PressEvent<T>) => void;
    onPressStart?: (event: PressEvent<T>) => void;
    onPressEnd?: (event: PressEvent<T>) => void;
    onPressChange?: (isPressed: boolean) => void;
    onPressUp?: (event: PressEvent<T>) => void;
}

export interface KeyboardEvents {
    onKeyDown?: (e: KeyboardEvent) => void;
    onKeyUp?: (e: KeyboardEvent) => void;
}

interface BaseMoveEvent {
    pointerType: PointerType;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
}

export interface MoveStartEvent extends BaseMoveEvent {
    type: 'movestart';
}

export interface MoveMoveEvent extends BaseMoveEvent {
    type: 'move';
    deltaX: number;
    deltaY: number;
}

export interface MoveEndEvent extends BaseMoveEvent {
    type: 'moveend';
}

export type MoveEvent = MoveStartEvent | MoveMoveEvent | MoveEndEvent;

export interface MoveEvents {
    onMoveStart?: (e: MoveStartEvent) => void;
    onMove?: (e: MoveMoveEvent) => void;
    onMoveEnd?: (e: MoveEndEvent) => void;
}

export interface FocusableProps<T extends FocusableElement = FocusableElement>
    extends FocusEvents<T>,
        KeyboardEvents {
    autoFocus?: boolean;
}
