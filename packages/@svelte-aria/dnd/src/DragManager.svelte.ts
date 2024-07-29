/* eslint-disable @typescript-eslint/unbound-method */
import { announce } from '@svelte-aria/live-announcer';
import { ariaHideOutside } from '@svelte-aria/overlays';
import type {
    DragEndEvent,
    DragItem,
    DropActivateEvent,
    DropEnterEvent,
    DropEvent,
    DropExitEvent,
    DropItem,
    DropOperation,
    DropTarget as DroppableCollectionTarget,
    FocusableElement
} from '@svelte-types/shared';
import { getDragModality, getTypes } from './utils';
import { isVirtualClick, isVirtualPointerEvent } from '@svelte-aria/utils';
import type { LocalizedStringFormatter } from '@internationalized-svelte/string';

const dropTargets = new Map<Element, DropTarget>();
const dropItems = new Map<Element, DroppableItem>();
let dragSession: DragSession | null = null;
const subscriptions = new Set<() => void>();

interface DropTarget {
    element: FocusableElement;
    preventFocusOnDrop?: boolean;
    getDropOperation?: (types: Set<string>, allowedOperations: DropOperation[]) => DropOperation;
    onDropEnter?: (e: DropEnterEvent, dragTarget: DragTarget) => void;
    onDropExit?: (e: DropExitEvent) => void;
    onDropTargetEnter?: (target?: DroppableCollectionTarget) => void;
    onDropActivate?: (e: DropActivateEvent, target?: DroppableCollectionTarget) => void;
    onDrop?: (e: DropEvent, target?: DroppableCollectionTarget) => void;
    onKeyDown?: (e: KeyboardEvent, dragTarget: DragTarget) => void;
}

export const registerDropTarget = (target: DropTarget) => {
    dropTargets.set(target.element, target);
    dragSession?.updateValidDropTargets();
    return () => {
        dropTargets.delete(target.element);
        dragSession?.updateValidDropTargets();
    };
};

interface DroppableItem {
    element: FocusableElement;
    target: DroppableCollectionTarget;
    getDropOperation?: (types: Set<string>, allowedOperations: DropOperation[]) => DropOperation;
}

export const registerDropItem = (item: DroppableItem) => {
    dropItems.set(item.element, item);
    return () => {
        dropItems.delete(item.element);
    };
};

interface DragTarget {
    element: FocusableElement;
    items: DragItem[];
    allowedDropOperations: DropOperation[];
    onDragEnd?: (e: DragEndEvent) => void;
}

export const beginDragging = (target: DragTarget, stringFormatter: LocalizedStringFormatter) => {
    if (dragSession) {
        throw new Error('Cannot begin dragging while already dragging');
    }

    dragSession = new DragSession(target, stringFormatter);
    requestAnimationFrame(() => {
        dragSession?.setup();
        if (getDragModality() === 'keyboard') {
            dragSession?.next();
        }
    });

    for (const cb of subscriptions) {
        cb();
    }
};

export const useDragSession = () => {
    let session = $state(dragSession);

    $effect(() => {
        const cb = () => (session = dragSession);
        subscriptions.add(cb);
        return () => {
            subscriptions.delete(cb);
        };
    });

    return session;
};

export const isVirtualDragging = (): boolean => {
    return !!dragSession;
};

const endDragging = () => {
    dragSession = null;
    for (const cb of subscriptions) {
        cb();
    }
};

export const isValidDropTarget = (element: Element): boolean => {
    for (const target of dropTargets.keys()) {
        if (target.contains(element)) {
            return true;
        }
    }

    return false;
};

const CANCELED_EVENTS = [
    'pointerdown',
    'pointermove',
    'pointerenter',
    'pointerleave',
    'pointerover',
    'pointerout',
    'pointerup',
    'mousedown',
    'mousemove',
    'mouseenter',
    'mouseleave',
    'mouseover',
    'mouseout',
    'mouseup',
    'touchstart',
    'touchmove',
    'touchend',
    'focusin',
    'focusout'
];

const CLICK_EVENTS = ['pointerup', 'mouseup', 'touchend'];

const MESSAGES = {
    keyboard: 'dragStartedKeyboard',
    touch: 'dragStartedTouch',
    virtual: 'dragStartedVirtual'
};

class DragSession {
    dragTarget: DragTarget;
    validDropTargets: DropTarget[] | undefined;
    currentDropTarget: DropTarget | undefined | null;
    currentDropItem: DroppableItem | undefined;
    dropOperation: DropOperation | undefined;
    private mutationObserver: MutationObserver | undefined;
    private restoreAriaHidden: (() => void) | undefined;
    private stringFormatter: LocalizedStringFormatter;
    private isVirtualClick: boolean | undefined;
    private initialFocused: boolean;

    constructor(target: DragTarget, stringFormatter: LocalizedStringFormatter) {
        this.dragTarget = target;
        this.stringFormatter = stringFormatter;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onFocus = this.onFocus.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.cancelEvent = this.cancelEvent.bind(this);
        this.initialFocused = false;
    }

    setup() {
        document.addEventListener('keydown', this.onKeyDown, true);
        document.addEventListener('keyup', this.onKeyUp, true);
        window.addEventListener('focus', this.onFocus, true);
        window.addEventListener('blur', this.onBlur, true);
        document.addEventListener('click', this.onClick, true);
        document.addEventListener('pointerdown', this.onPointerDown, true);

        for (const event of CANCELED_EVENTS) {
            document.addEventListener(event, this.cancelEvent, true);
        }

        this.mutationObserver = new MutationObserver(() => this.updateValidDropTargets());
        this.updateValidDropTargets();

        // @ts-expect-error - ignore it for now
        announce(this.stringFormatter.format(MESSAGES[getDragModality()]));
    }

    teardown() {
        document.removeEventListener('keydown', this.onKeyDown, true);
        document.removeEventListener('keyup', this.onKeyUp, true);
        window.removeEventListener('focus', this.onFocus, true);
        window.removeEventListener('blur', this.onBlur, true);
        document.removeEventListener('click', this.onClick, true);
        document.removeEventListener('pointerdown', this.onPointerDown, true);

        for (const event of CANCELED_EVENTS) {
            document.removeEventListener(event, this.cancelEvent, true);
        }

        this.mutationObserver!.disconnect();
        this.restoreAriaHidden!();
    }

    onKeyDown(e: KeyboardEvent) {
        this.cancelEvent(e);

        if (e.key === 'Escape') {
            this.cancel();
            return;
        }

        if (e.key === 'Tab' && !(e.metaKey || e.altKey || e.ctrlKey)) {
            if (e.shiftKey) {
                this.previous();
            } else {
                this.next();
            }
        }

        if (typeof this.currentDropTarget?.onKeyDown === 'function') {
            this.currentDropTarget.onKeyDown(e, this.dragTarget);
        }
    }

    onKeyUp(e: KeyboardEvent) {
        this.cancelEvent(e);

        if (e.key === 'Enter') {
            if (e.altKey) {
                this.activate();
            } else {
                this.drop();
            }
        }
    }

    onFocus(e: FocusEvent) {
        if (e.target !== this.dragTarget.element) {
            this.cancelEvent(e);
        }

        if (!(e.target instanceof HTMLElement) || e.target === this.dragTarget.element) {
            return;
        }

        const dropTarget =
            this.validDropTargets!.find((target) => target.element === (e.target as HTMLElement)) ??
            this.validDropTargets!.find((target) =>
                target.element.contains(e.target as HTMLElement)
            );

        if (!dropTarget) {
            if (this.currentDropTarget) {
                this.currentDropTarget.element.focus();
            } else {
                this.dragTarget.element.focus();
            }
            return;
        }

        const item = dropItems.get(e.target);
        this.setCurrentDropTarget(dropTarget, item);
    }

    onBlur(e: FocusEvent) {
        if (e.target !== this.dragTarget.element) {
            this.cancelEvent(e);
        }

        if (!e.relatedTarget || !(e.relatedTarget instanceof HTMLElement)) {
            if (this.currentDropTarget) {
                this.currentDropTarget.element.focus();
            } else {
                this.dragTarget.element.focus();
            }
        }
    }

    onClick(e: MouseEvent) {
        this.cancelEvent(e);
        if (isVirtualClick(e) || this.isVirtualClick) {
            if (e.target === this.dragTarget.element) {
                this.cancel();
                return;
            }

            const dropTarget = this.validDropTargets!.find((target) =>
                target.element.contains(e.target as HTMLElement)
            );
            if (dropTarget) {
                const item = dropItems.get(e.target as HTMLElement);
                this.setCurrentDropTarget(dropTarget, item);
                this.drop(item);
            }
        }
    }

    onPointerDown(e: PointerEvent) {
        this.cancelEvent(e);
        this.isVirtualClick = isVirtualPointerEvent(e);
    }

    cancelEvent(e: Event) {
        if (
            (e.type === 'focusin' || e.type === 'focusout') &&
            e.target === this.dragTarget?.element
        ) {
            return;
        }

        if (!CLICK_EVENTS.includes(e.type)) {
            e.preventDefault();
        }

        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    updateValidDropTargets() {
        if (!this.mutationObserver) {
            return;
        }

        this.mutationObserver.disconnect();
        if (this.restoreAriaHidden) {
            this.restoreAriaHidden();
        }

        this.validDropTargets = findValidDropTargets(this.dragTarget);

        if (this.validDropTargets.length > 0) {
            const nearestIndex = this.findNearestDropTarget();
            this.validDropTargets = [
                ...this.validDropTargets.slice(nearestIndex),
                ...this.validDropTargets.slice(0, nearestIndex)
            ];
        }

        if (this.currentDropTarget && !this.validDropTargets.includes(this.currentDropTarget)) {
            this.setCurrentDropTarget(this.validDropTargets[0]);
        }

        const types = getTypes(this.dragTarget.items);
        const validDropItems = [...dropItems.values()].filter((item) => {
            if (typeof item.getDropOperation === 'function') {
                return (
                    item.getDropOperation(types, this.dragTarget.allowedDropOperations) !== 'cancel'
                );
            }

            return true;
        });

        const visibleDropTargets = this.validDropTargets.filter(
            (target) => !validDropItems.some((item) => target.element.contains(item.element))
        );

        this.restoreAriaHidden = ariaHideOutside([
            this.dragTarget.element,
            ...validDropItems.map((item) => item.element),
            ...visibleDropTargets.map((target) => target.element)
        ]);

        this.mutationObserver.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-hidden']
        });
    }

    next() {
        if (!this.currentDropTarget) {
            this.setCurrentDropTarget(this.validDropTargets![0]);
            return;
        }

        const index = this.validDropTargets!.indexOf(this.currentDropTarget);
        if (index < 0) {
            this.setCurrentDropTarget(this.validDropTargets![0]);
            return;
        }

        if (index === this.validDropTargets!.length - 1) {
            if (!this.dragTarget.element.closest('[aria-hidden="true"]')) {
                this.setCurrentDropTarget(null);
                this.dragTarget.element.focus();
            } else {
                this.setCurrentDropTarget(this.validDropTargets![0]);
            }
        } else {
            this.setCurrentDropTarget(this.validDropTargets![index + 1]);
        }
    }

    previous() {
        if (!this.currentDropTarget) {
            this.setCurrentDropTarget(this.validDropTargets![this.validDropTargets!.length - 1]);
            return;
        }

        const index = this.validDropTargets!.indexOf(this.currentDropTarget);
        if (index < 0) {
            this.setCurrentDropTarget(this.validDropTargets![this.validDropTargets!.length - 1]);
            return;
        }

        if (index === 0) {
            if (!this.dragTarget.element.closest('[aria-hidden="true"]')) {
                this.setCurrentDropTarget(null);
                this.dragTarget.element.focus();
            } else {
                this.setCurrentDropTarget(
                    this.validDropTargets![this.validDropTargets!.length - 1]
                );
            }
        } else {
            this.setCurrentDropTarget(this.validDropTargets![index - 1]);
        }
    }

    findNearestDropTarget(): number {
        const dragTargetRect = this.dragTarget.element.getBoundingClientRect();

        let minDistance = Infinity;
        let nearest = -1;
        for (let i = 0; i < this.validDropTargets!.length; i++) {
            const dropTarget = this.validDropTargets![i];
            const rect = dropTarget.element.getBoundingClientRect();
            const dx = rect.left - dragTargetRect.left;
            const dy = rect.top - dragTargetRect.top;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
                minDistance = dist;
                nearest = i;
            }
        }

        return nearest;
    }

    setCurrentDropTarget(dropTarget: DropTarget | null, item?: DroppableItem) {
        if (dropTarget !== this.currentDropTarget) {
            if (this.currentDropTarget && typeof this.currentDropTarget.onDropExit === 'function') {
                const rect = this.currentDropTarget.element.getBoundingClientRect();
                this.currentDropTarget.onDropExit({
                    type: 'dropexit',
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }

            this.currentDropTarget = dropTarget;

            if (dropTarget) {
                if (typeof dropTarget.onDropEnter === 'function') {
                    const rect = dropTarget.element.getBoundingClientRect();
                    dropTarget.onDropEnter(
                        {
                            type: 'dropenter',
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2
                        },
                        this.dragTarget
                    );
                }

                if (!item) {
                    dropTarget?.element.focus();
                }
            }
        }

        if (item !== this.currentDropItem) {
            if (item && typeof this.currentDropTarget?.onDropTargetEnter === 'function') {
                this.currentDropTarget.onDropTargetEnter(item?.target);
            }

            item?.element.focus();
            this.currentDropItem = item;

            if (!this.initialFocused) {
                // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
                announce(item?.element.getAttribute('aria-label') as string, 'polite');
                this.initialFocused = true;
            }
        }
    }

    end() {
        this.teardown();
        endDragging();

        if (typeof this.dragTarget.onDragEnd === 'function') {
            const target =
                this.currentDropTarget && this.dropOperation !== 'cancel'
                    ? this.currentDropTarget
                    : this.dragTarget;
            const rect = target.element.getBoundingClientRect();
            this.dragTarget.onDragEnd({
                type: 'dragend',
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                dropOperation: this.dropOperation ?? 'cancel'
            });
        }

        if (this.currentDropTarget && !this.currentDropTarget.preventFocusOnDrop) {
            document?.activeElement?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        }

        this.setCurrentDropTarget(null);
    }

    cancel() {
        this.setCurrentDropTarget(null);
        this.end();
        if (!this.dragTarget.element.closest('[aria-hidden="true"]')) {
            this.dragTarget.element.focus();
        }

        announce(this.stringFormatter.format('dropCanceled'));
    }

    drop(item?: DroppableItem) {
        if (!this.currentDropTarget) {
            this.cancel();
            return;
        }

        if (typeof item?.getDropOperation === 'function') {
            const types = getTypes(this.dragTarget.items);
            this.dropOperation = item.getDropOperation(
                types,
                this.dragTarget.allowedDropOperations
            );
        } else if (typeof this.currentDropTarget.getDropOperation === 'function') {
            const types = getTypes(this.dragTarget.items);
            this.dropOperation = this.currentDropTarget.getDropOperation(
                types,
                this.dragTarget.allowedDropOperations
            );
        } else {
            this.dropOperation = this.dragTarget.allowedDropOperations[0];
        }

        if (typeof this.currentDropTarget.onDrop === 'function') {
            const items: DropItem[] = this.dragTarget.items.map((item) => ({
                kind: 'text',
                types: new Set(Object.keys(item)),
                getText: (type: string) => Promise.resolve(item[type])
            }));

            const rect = this.currentDropTarget.element.getBoundingClientRect();
            this.currentDropTarget.onDrop(
                {
                    type: 'drop',
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    items,
                    dropOperation: this.dropOperation
                },
                item?.target
            );
        }

        this.end();
        announce(this.stringFormatter.format('dropComplete'));
    }

    activate() {
        if (this.currentDropTarget && typeof this.currentDropTarget.onDropActivate === 'function') {
            const rect = this.currentDropTarget.element.getBoundingClientRect();
            this.currentDropTarget.onDropActivate({
                type: 'dropactivate',
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
    }
}

const findValidDropTargets = (options: DragTarget) => {
    const types = getTypes(options.items);
    return [...dropTargets.values()].filter((target) => {
        if (target.element.closest('[aria-hidden="true"]')) {
            return false;
        }

        if (typeof target.getDropOperation === 'function') {
            return target.getDropOperation(types, options.allowedDropOperations) !== 'cancel';
        }

        return true;
    });
};
