import { useFocus } from '@svelte-aria/interactions';
import { chain, useEffectEvent } from '@svelte-aria/utils';
import type { DropItem, DragItem, DOMAttributes, FocusableElement } from '@svelte-types/shared';
import { readFromDataTransfer, writeToDataTransfer } from '../utils';

export interface ClipboardProps {
    getItems?: () => DragItem[];
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: (items: DropItem[]) => void;
    isDisabled?: boolean;
}

export interface ClipboardResult<T extends FocusableElement = FocusableElement> {
    clipboardProps: DOMAttributes<T>;
}

const globalEvents = new Map<
    string,
    { listener: (e: any) => void; handlers: Set<(e: Event) => void> }
>();

function addGlobalEventListener<T extends Event>(event: string, fn: (e: T) => void) {
    let eventData = globalEvents.get(event);
    if (!eventData) {
        const handlers = new Set<(e: Event) => void>();
        const listener = (e: Event) => {
            for (const handler of handlers) {
                handler(e);
            }
        };

        eventData = { listener, handlers };
        globalEvents.set(event, eventData);

        document.addEventListener(event, listener);
    }

    // @ts-expect-error - we know that T extends Event
    eventData.handlers.add(fn);
    return () => {
        // @ts-expect-error - we know that T extends Event
        eventData.handlers.delete(fn);
        if (eventData.handlers.size === 0) {
            document.removeEventListener(event, eventData.listener);
            globalEvents.delete(event);
        }
    };
}

export const useClipboard = <T extends FocusableElement = FocusableElement>(
    options: ClipboardProps = {}
): ClipboardResult<T> => {
    const { isDisabled } = options;
    let isFocusedRef = false;
    const { focusProps } = useFocus({
        onFocusChange: (isFocused) => {
            isFocusedRef = isFocused;
        }
    });

    const onBeforeCopy = useEffectEvent((e: ClipboardEvent) => {
        if (isFocusedRef && options.getItems) {
            e.preventDefault();
        }
    });

    const onCopy = useEffectEvent((e: ClipboardEvent) => {
        if (!isFocusedRef || !options.getItems) {
            return;
        }

        e.preventDefault();
        writeToDataTransfer(e.clipboardData!, options.getItems());
        options.onCopy?.();
    });

    const onBeforeCut = useEffectEvent((e: ClipboardEvent) => {
        if (isFocusedRef && options.onCut && options.getItems) {
            e.preventDefault();
        }
    });

    const onCut = useEffectEvent((e: ClipboardEvent) => {
        if (!isFocusedRef || !options.onCut || !options.getItems) {
            return;
        }

        e.preventDefault();
        writeToDataTransfer(e.clipboardData!, options.getItems());
        options.onCut();
    });

    const onBeforePaste = useEffectEvent((e: ClipboardEvent) => {
        if (isFocusedRef && options.onPaste) {
            e.preventDefault();
        }
    });

    const onPaste = useEffectEvent((e: ClipboardEvent) => {
        if (!isFocusedRef || !options.onPaste) {
            return;
        }

        e.preventDefault();
        const items = readFromDataTransfer(e.clipboardData!);
        options.onPaste(items);
    });

    $effect(() => {
        if (isDisabled) {
            return;
        }
        return chain(
            addGlobalEventListener('beforecopy', onBeforeCopy),
            addGlobalEventListener('copy', onCopy),
            addGlobalEventListener('beforecut', onBeforeCut),
            addGlobalEventListener('cut', onCut),
            addGlobalEventListener('beforepaste', onBeforePaste),
            addGlobalEventListener('paste', onPaste)
        );
    });

    return {
        clipboardProps: focusProps
    };
};
