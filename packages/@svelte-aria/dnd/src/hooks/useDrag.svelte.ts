import { useLocalizedStringFormatter } from '@svelte-aria/i18n';
import type { AriaButtonProps } from '@svelte-types/button';
import type {
    DragStartEvent,
    DragMoveEvent,
    DragEndEvent,
    DragItem,
    DropOperation,
    PressEvent
} from '@svelte-types/shared';
import type { HTMLAttributes } from 'svelte/elements';
import {
    isVirtualClick,
    isVirtualPointerEvent,
    useDescription,
    useGlobalListeners
} from '@svelte-aria/utils';
import {
    globalDropEffect,
    setGlobalAllowedDropOperations,
    setGlobalDropEffect,
    useDragModality,
    writeToDataTransfer
} from '../utils';
import { DROP_EFFECT_TO_DROP_OPERATION, DROP_OPERATION, EFFECT_ALLOWED } from '../constants';
import * as DragManager from '../DragManager.svelte';
import { useGenID } from '@svelte-aria/utils/src/useId';

const intlMessages: Record<string, Record<string, string>> = {};

const loadIntlMessages = async () => {
    // @ts-expect-error - ignore it
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const files = import.meta.glob('../../intl/*.json') as Record<
        string,
        () => Promise<{ default: Record<string, string> }>
    >;
    for (const path in files) {
        const locale = /intl\/(.*)\.json/.exec(path)![1];
        // prettier-ignore
        intlMessages[locale] = 
        (
            /* @vite-ignore */
            (await import(path)) as {
                default: Record<string, string>;
            }
        ).default;
    }
};

await loadIntlMessages();

export interface DragOptions {
    onDragStart?: (e: DragStartEvent) => void;
    onDragMove?: (e: DragMoveEvent) => void;
    onDragEnd?: (e: DragEndEvent) => void;
    getItems: () => DragItem[];
    getAllowedDropOperations?: () => DropOperation[];
    hasDragButton?: boolean;
    isDisabled?: boolean;
}

export interface DragResult<T extends HTMLElement = HTMLElement> {
    dragProps: HTMLAttributes<T>;
    dragButtonProps: AriaButtonProps;
    isDragging: () => boolean;
    items: DragItem[];
    id: string;
}

const MESSAGES = {
    keyboard: {
        start: 'dragDescriptionKeyboard',
        end: 'endDragKeyboard'
    },
    touch: {
        start: 'dragDescriptionTouch',
        end: 'endDragTouch'
    },
    virtual: {
        start: 'dragDescriptionVirtual',
        end: 'endDragVirtual'
    }
};

export const useDrag = <T extends HTMLElement = HTMLElement>(
    options: DragOptions
): DragResult<T> => {
    const { hasDragButton, isDisabled } = options;
    const id = useGenID({
        customPrefix: 'dnd'
    });

    const stringFormatter = useLocalizedStringFormatter(intlMessages, '@svelte-aria/dnd');
    const state = {
        options,
        x: 0,
        y: 0
    };
    state.options = options;
    let isDraggingRef = false;
    let isDragging = $state(false);
    const setDragging = (_isDragging: boolean) => {
        isDraggingRef = _isDragging;
        isDragging = _isDragging;
    };
    const { addGlobalListener, removeAllGlobalListeners } = useGlobalListeners();
    let modalityOnPointerDown: string | null = null;

    const onDragStart = (e: DragEvent) => {
        if (e.defaultPrevented) {
            return;
        }

        e.stopPropagation();

        if (modalityOnPointerDown === 'virtual') {
            e.preventDefault();
            startDragging(e.target as HTMLElement);
            modalityOnPointerDown = null;
            return;
        }

        if (typeof options.onDragStart === 'function') {
            options.onDragStart({
                type: 'dragstart',
                x: e.clientX,
                y: e.clientY
            });
        }

        const items = options.getItems();
        writeToDataTransfer(e.dataTransfer!, items);

        let allowed = DROP_OPERATION.all;
        if (typeof options.getAllowedDropOperations === 'function') {
            const allowedOperations = options.getAllowedDropOperations();
            allowed = DROP_OPERATION.none;
            for (const operation of allowedOperations) {
                allowed |= DROP_OPERATION[operation] || DROP_OPERATION.none;
            }
        }

        setGlobalAllowedDropOperations(allowed);
        // @ts-expect-error - ignore it
        e.dataTransfer!.effectAllowed = EFFECT_ALLOWED[allowed] || 'none';

        const previewContainer = document.getElementById(id);

        if (previewContainer) {
            const node = previewContainer;
            const size = node.getBoundingClientRect();
            const rect = (e.currentTarget as EventTarget & HTMLElement).getBoundingClientRect();
            let x = e.clientX - rect.x;
            let y = e.clientY - rect.y;
            if (x > size.width || y > size.height) {
                x = size.width / 2;
                y = size.height / 2;
            }

            const height = 2 * Math.round(size.height / 2);
            node.style.height = `${height}px`;

            e.dataTransfer!.setDragImage(node, x, y);
        }

        addGlobalListener(
            window,
            'drop',
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.warn(
                    'Drags initiated from the Svelte Aria useDrag hook may only be dropped on a target created with useDrop. This ensures that a keyboard and screen reader accessible alternative is available.'
                );
            },
            { once: true }
        );
        state.x = e.clientX;
        state.y = e.clientY;

        requestAnimationFrame(() => {
            setDragging(true);
        });
    };

    const onDrag = (e: DragEvent) => {
        e.stopPropagation();

        if (e.clientX === state.x && e.clientY === state.y) {
            return;
        }

        if (typeof options.onDragMove === 'function') {
            options.onDragMove({
                type: 'dragmove',
                x: e.clientX,
                y: e.clientY
            });
        }

        state.x = e.clientX;
        state.y = e.clientY;
    };

    const onDragEnd = (e: DragEvent) => {
        e.stopPropagation();

        if (typeof options.onDragEnd === 'function') {
            const event: DragEndEvent = {
                type: 'dragend',
                x: e.clientX,
                y: e.clientY,
                dropOperation: DROP_EFFECT_TO_DROP_OPERATION[e.dataTransfer!.dropEffect]
            };

            if (globalDropEffect) {
                event.dropOperation = DROP_EFFECT_TO_DROP_OPERATION[globalDropEffect];
            }
            options.onDragEnd(event);
        }

        setDragging(false);
        removeAllGlobalListeners();
        setGlobalAllowedDropOperations(DROP_OPERATION.none);
        setGlobalDropEffect(undefined);
    };

    if (typeof window !== 'undefined') {
        $effect.pre(() => {
            return () => {
                if (isDraggingRef) {
                    if (typeof state.options.onDragEnd === 'function') {
                        const event: DragEndEvent = {
                            type: 'dragend',
                            x: 0,
                            y: 0,
                            dropOperation: DROP_EFFECT_TO_DROP_OPERATION[globalDropEffect ?? 'none']
                        };
                        state.options.onDragEnd(event);
                    }

                    setDragging(false);
                    setGlobalAllowedDropOperations(DROP_OPERATION.none);
                    setGlobalDropEffect(undefined);
                }
            };
        });
    }

    const onPress = (e: PressEvent) => {
        if (e.pointerType !== 'keyboard' && e.pointerType !== 'virtual') {
            return;
        }

        startDragging(e.target as HTMLElement);
    };

    const startDragging = (target: HTMLElement) => {
        if (typeof state.options.onDragStart === 'function') {
            const rect = target.getBoundingClientRect();
            state.options.onDragStart({
                type: 'dragstart',
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2
            });
        }

        DragManager.beginDragging(
            {
                element: target,
                items: state.options.getItems(),
                allowedDropOperations:
                    typeof state.options.getAllowedDropOperations === 'function'
                        ? state.options.getAllowedDropOperations()
                        : ['move', 'copy', 'link'],
                onDragEnd(e) {
                    setDragging(false);
                    if (typeof state.options.onDragEnd === 'function') {
                        state.options.onDragEnd(e);
                    }
                }
            },
            stringFormatter
        );

        setDragging(true);
    };

    const modality = useDragModality();
    const message = !isDragging
        ? MESSAGES[modality as 'keyboard' | 'touch' | 'virtual'].start
        : MESSAGES[modality as 'keyboard' | 'touch' | 'virtual'].end;

    const descriptionProps = useDescription(stringFormatter.format(message));

    let interactions: HTMLAttributes<HTMLElement>;
    if (!hasDragButton) {
        interactions = {
            ...descriptionProps,
            onpointerdown: (e) => {
                modalityOnPointerDown = isVirtualPointerEvent(e) ? 'virtual' : e.pointerType;

                if (e.width < 1 && e.height < 1) {
                    modalityOnPointerDown = 'virtual';
                } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetX = e.clientX - rect.x;
                    const offsetY = e.clientY - rect.y;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    if (Math.abs(offsetX - centerX) <= 0.5 && Math.abs(offsetY - centerY) <= 0.5) {
                        modalityOnPointerDown = 'virtual';
                    } else {
                        modalityOnPointerDown = e.pointerType;
                    }
                }
            },
            onkeydowncapture: (e) => {
                if (e.target === e.currentTarget && e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
            onkeyupcapture: (e) => {
                if (e.target === e.currentTarget && e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    startDragging(e.target as HTMLElement);
                }
            },
            onclick: (e) => {
                if (isVirtualClick(e) || modalityOnPointerDown === 'virtual') {
                    e.preventDefault();
                    e.stopPropagation();
                    startDragging(e.target as HTMLElement);
                }
            }
        };
    }

    if (isDisabled) {
        return {
            dragProps: {
                draggable: 'false'
            },
            dragButtonProps: {},
            isDragging: () => false,
            items: [],
            id: ''
        };
    }

    interactions = {};

    return {
        dragProps: {
            ...interactions,
            draggable: 'true',
            ondragstart: onDragStart,
            ondrag: onDrag,
            ondragend: onDragEnd
        },
        dragButtonProps: {
            ...descriptionProps,
            onPress
        },
        isDragging: () => isDragging,
        items: options.getItems(),
        id
    };
};
