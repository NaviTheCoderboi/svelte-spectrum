import type { FocusableElement } from './dom';

export type PointerType = 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual';

export interface LongPressEvent extends Omit<PressEvent, 'type' | 'continuePropagation'> {
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
