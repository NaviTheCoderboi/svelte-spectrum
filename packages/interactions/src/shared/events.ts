import type { FocusableElement } from './dom';

export type PointerType = 'mouse' | 'pen' | 'touch' | 'keyboard' | 'virtual';

export interface HoverEventContext<T extends Element = Element> {
    type: 'hoverstart' | 'hoverend';
    pointerType: PointerType;
    target: T;
}

export interface HoverEvents<T extends Element = Element> {
    onHoverStart?: (event: HoverEventContext<T>) => void;
    onHoverEnd?: (event: HoverEventContext<T>) => void;
    onHoverChange?: (isHovered: boolean) => void;
}

export interface PressEventContext<T extends FocusableElement = FocusableElement> {
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
    onPress?: (event: PressEventContext<T>) => void;
    onPressStart?: (event: PressEventContext<T>) => void;
    onPressEnd?: (event: PressEventContext<T>) => void;
    onPressChange?: (isPressed: boolean) => void;
    onPressUp?: (event: PressEventContext<T>) => void;
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
    continuePropagation(): void;
}
