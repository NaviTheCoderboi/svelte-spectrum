import type { PressProps } from '../../hooks/usePress.svelte';
import type { FocusableElement } from '../../shared/dom';

export interface IPressResponderContext<T extends FocusableElement = FocusableElement>
    extends PressProps<T> {
    register: () => void;
    ref?: FocusableElement;
}

export const contextName = 'PressResponderContext';

export let PressResponderContext: IPressResponderContext = {
    register: () => {}
};

export const setPressResponderContext = (context: IPressResponderContext) => {
    PressResponderContext = context;
};
