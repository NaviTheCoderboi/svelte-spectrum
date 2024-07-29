import { createEventHandler } from '../utils/createEventHandler';
import type { DOMAttributes, KeyboardEvents } from '@svelte-types/shared';

export interface KeyboardProps extends KeyboardEvents {
    isDisabled?: boolean;
}

export interface KeyboardResult {
    keyboardProps: DOMAttributes;
}

export const useKeyboard = (props: KeyboardProps): KeyboardResult => {
    return {
        keyboardProps: props.isDisabled
            ? {}
            : {
                  onkeydown: createEventHandler(props.onKeyDown),
                  onkeyup: createEventHandler(props.onKeyUp)
              }
    };
};
