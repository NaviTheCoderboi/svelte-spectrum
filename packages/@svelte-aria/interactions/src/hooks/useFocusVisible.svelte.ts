import { getOwnerDocument, getOwnerWindow, isMac, isVirtualClick } from '@svelte-aria/utils';

const isSSR = () => {
    return typeof window === 'undefined';
};

export type Modality = 'keyboard' | 'pointer' | 'virtual';
type HandlerEvent = PointerEvent | MouseEvent | KeyboardEvent | FocusEvent | null;
type Handler = (modality: Modality, e: HandlerEvent) => void;
export type FocusVisibleHandler = (isFocusVisible: boolean) => void;
export interface FocusVisibleProps {
    isTextInput?: boolean;
    autoFocus?: boolean;
}

export interface FocusVisibleResult {
    isFocusVisible: () => boolean;
}

let currentModality: null | Modality = null;
const changeHandlers = new Set<Handler>();
interface GlobalListenerData {
    focus: () => void;
}
export const hasSetupGlobalListeners = new Map<Window, GlobalListenerData>();
let hasEventBeforeFocus = false;
let hasBlurredWindowRecently = false;

const FOCUS_VISIBLE_INPUT_KEYS = {
    Tab: true,
    Escape: true
};

const triggerChangeHandlers = (modality: Modality, e: HandlerEvent) => {
    for (const handler of changeHandlers) {
        handler(modality, e);
    }
};

const isValidKey = (e: KeyboardEvent) => {
    return !(
        e.metaKey ||
        (!isMac() && e.altKey) ||
        e.ctrlKey ||
        e.key === 'Control' ||
        e.key === 'Shift' ||
        e.key === 'Meta'
    );
};

const handleKeyboardEvent = (e: KeyboardEvent) => {
    hasEventBeforeFocus = true;
    if (isValidKey(e)) {
        currentModality = 'keyboard';
        triggerChangeHandlers('keyboard', e);
    }
};

const handlePointerEvent = (e: PointerEvent | MouseEvent) => {
    currentModality = 'pointer';
    if (e.type === 'mousedown' || e.type === 'pointerdown') {
        hasEventBeforeFocus = true;
        triggerChangeHandlers('pointer', e);
    }
};

const handleClickEvent = (e: MouseEvent) => {
    if (isVirtualClick(e)) {
        hasEventBeforeFocus = true;
        currentModality = 'virtual';
    }
};

const handleFocusEvent = (e: FocusEvent) => {
    if (e.target === window || e.target === document) {
        return;
    }

    if (!hasEventBeforeFocus && !hasBlurredWindowRecently) {
        currentModality = 'virtual';
        triggerChangeHandlers('virtual', e);
    }

    hasEventBeforeFocus = false;
    hasBlurredWindowRecently = false;
};

const handleWindowBlur = () => {
    hasEventBeforeFocus = false;
    hasBlurredWindowRecently = true;
};

const setupGlobalFocusEvents = (element?: HTMLElement | null) => {
    if (typeof window === 'undefined' || hasSetupGlobalListeners.get(getOwnerWindow(element))) {
        return;
    }

    const windowObject = getOwnerWindow(element);
    const documentObject = getOwnerDocument(element);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const focus = windowObject.HTMLElement.prototype.focus;
    windowObject.HTMLElement.prototype.focus = function () {
        hasEventBeforeFocus = true;
        // eslint-disable-next-line prefer-rest-params
        focus.apply(this, arguments as unknown as [options?: FocusOptions | undefined]);
    };

    documentObject.addEventListener('keydown', handleKeyboardEvent, true);
    documentObject.addEventListener('keyup', handleKeyboardEvent, true);
    documentObject.addEventListener('click', handleClickEvent, true);

    windowObject.addEventListener('focus', handleFocusEvent, true);
    windowObject.addEventListener('blur', handleWindowBlur, false);

    if (typeof PointerEvent !== 'undefined') {
        documentObject.addEventListener('pointerdown', handlePointerEvent, true);
        documentObject.addEventListener('pointermove', handlePointerEvent, true);
        documentObject.addEventListener('pointerup', handlePointerEvent, true);
    } else {
        documentObject.addEventListener('mousedown', handlePointerEvent, true);
        documentObject.addEventListener('mousemove', handlePointerEvent, true);
        documentObject.addEventListener('mouseup', handlePointerEvent, true);
    }

    windowObject.addEventListener(
        'beforeunload',
        () => {
            tearDownWindowFocusTracking(element);
        },
        { once: true }
    );

    hasSetupGlobalListeners.set(windowObject, { focus });
};

const tearDownWindowFocusTracking = (element?: HTMLElement | null, loadListener?: () => void) => {
    const windowObject = getOwnerWindow(element);
    const documentObject = getOwnerDocument(element);
    if (loadListener) {
        documentObject.removeEventListener('DOMContentLoaded', loadListener);
    }
    if (!hasSetupGlobalListeners.has(windowObject)) {
        return;
    }
    windowObject.HTMLElement.prototype.focus = hasSetupGlobalListeners.get(windowObject)!.focus;

    documentObject.removeEventListener('keydown', handleKeyboardEvent, true);
    documentObject.removeEventListener('keyup', handleKeyboardEvent, true);
    documentObject.removeEventListener('click', handleClickEvent, true);
    windowObject.removeEventListener('focus', handleFocusEvent, true);
    windowObject.removeEventListener('blur', handleWindowBlur, false);

    if (typeof PointerEvent !== 'undefined') {
        documentObject.removeEventListener('pointerdown', handlePointerEvent, true);
        documentObject.removeEventListener('pointermove', handlePointerEvent, true);
        documentObject.removeEventListener('pointerup', handlePointerEvent, true);
    } else {
        documentObject.removeEventListener('mousedown', handlePointerEvent, true);
        documentObject.removeEventListener('mousemove', handlePointerEvent, true);
        documentObject.removeEventListener('mouseup', handlePointerEvent, true);
    }

    hasSetupGlobalListeners.delete(windowObject);
};

export const addWindowFocusTracking = (element?: HTMLElement | null): (() => void) => {
    const documentObject = getOwnerDocument(element);
    let loadListener: () => void;
    if (documentObject.readyState !== 'loading') {
        setupGlobalFocusEvents(element);
    } else {
        loadListener = () => {
            setupGlobalFocusEvents(element);
        };
        documentObject.addEventListener('DOMContentLoaded', loadListener);
    }

    return () => tearDownWindowFocusTracking(element, loadListener);
};

if (!isSSR()) {
    addWindowFocusTracking();
}

export const isFocusVisible = (): boolean => {
    return currentModality !== 'pointer';
};

export const getInteractionModality = (): Modality | null => {
    return currentModality;
};

export const setInteractionModality = (modality: Modality) => {
    currentModality = modality;
    triggerChangeHandlers(modality, null);
};

export const useInteractionModality = (): Modality | null => {
    setupGlobalFocusEvents();

    let modality = $state(currentModality);
    $effect(() => {
        const handler = () => {
            modality = currentModality;
        };

        changeHandlers.add(handler);

        return () => {
            changeHandlers.delete(handler);
        };
    });

    return isSSR() ? null : modality;
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

const isKeyboardFocusEvent = (isTextInput: boolean, modality: Modality, e: HandlerEvent) => {
    const IHTMLInputElement =
        typeof window !== 'undefined'
            ? getOwnerWindow(e?.target as Element).HTMLInputElement
            : HTMLInputElement;
    const IHTMLTextAreaElement =
        typeof window !== 'undefined'
            ? getOwnerWindow(e?.target as Element).HTMLTextAreaElement
            : HTMLTextAreaElement;
    const IHTMLElement =
        typeof window !== 'undefined'
            ? getOwnerWindow(e?.target as Element).HTMLElement
            : HTMLElement;
    const IKeyboardEvent =
        typeof window !== 'undefined'
            ? getOwnerWindow(e?.target as Element).KeyboardEvent
            : KeyboardEvent;

    isTextInput =
        isTextInput ||
        (e?.target instanceof IHTMLInputElement && !nonTextInputTypes.has(e?.target?.type)) ||
        e?.target instanceof IHTMLTextAreaElement ||
        (e?.target instanceof IHTMLElement && e?.target.isContentEditable);
    return !(
        isTextInput &&
        modality === 'keyboard' &&
        e instanceof IKeyboardEvent &&
        !FOCUS_VISIBLE_INPUT_KEYS[e.key as keyof typeof FOCUS_VISIBLE_INPUT_KEYS]
    );
};

export const useFocusVisible = (props: FocusVisibleProps = {}): FocusVisibleResult => {
    const { isTextInput, autoFocus } = props;
    let isFocusVisibleState = $state(autoFocus ?? isFocusVisible());
    useFocusVisibleListener(
        (isFocusVisible) => {
            isFocusVisibleState = isFocusVisible;
        },
        { isTextInput }
    );

    return { isFocusVisible: () => isFocusVisibleState };
};

export const useFocusVisibleListener = (
    fn: FocusVisibleHandler,
    opts?: { isTextInput?: boolean }
): void => {
    setupGlobalFocusEvents();

    $effect(() => {
        const handler = (modality: Modality, e: HandlerEvent) => {
            if (!isKeyboardFocusEvent(!!opts?.isTextInput, modality, e)) {
                return;
            }
            fn(isFocusVisible());
        };
        changeHandlers.add(handler);
        return () => {
            changeHandlers.delete(handler);
        };
    });
};
