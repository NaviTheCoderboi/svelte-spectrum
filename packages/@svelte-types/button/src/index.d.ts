import type {
    AriaLabelingProps,
    FocusableDOMProps,
    FocusableProps,
    PressEvents
} from '@svelte-types/shared';
import type { Snippet, Component } from 'svelte';

interface ButtonProps extends PressEvents, FocusableProps {
    isDisabled?: boolean;
    children?: Snippet;
}

type ComponentOrElement = HTMLElement | Component;

export interface AriaButtonElementTypeProps<T extends ComponentOrElement = HTMLButtonElement> {
    elementType?: T;
}

export interface LinkButtonProps<T extends ComponentOrElement = HTMLButtonElement>
    extends AriaButtonElementTypeProps<T> {
    href?: string;
    target?: string;
    rel?: string;
}

interface AriaBaseButtonProps extends FocusableDOMProps, AriaLabelingProps {
    'aria-expanded'?: boolean | 'true' | 'false';
    'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | 'true' | 'false';
    'aria-controls'?: string;
    'aria-pressed'?: boolean | 'true' | 'false' | 'mixed';
    type?: 'button' | 'submit' | 'reset';
}

export interface AriaButtonProps<T extends ComponentOrElement = HTMLButtonElement>
    extends ButtonProps,
        LinkButtonProps<T>,
        AriaBaseButtonProps {}
