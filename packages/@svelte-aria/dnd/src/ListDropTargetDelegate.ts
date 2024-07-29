import type {
    Direction,
    DropTarget,
    DropTargetDelegate,
    Node,
    Orientation
} from '@svelte-types/shared';

interface ListDropTargetDelegateOptions {
    layout?: 'stack' | 'grid';
    orientation?: Orientation;
    direction?: Direction;
}

export class ListDropTargetDelegate implements DropTargetDelegate {
    private collection: Iterable<Node<unknown>>;
    private ref: HTMLElement | null;
    private layout: 'stack' | 'grid';
    private orientation: Orientation;
    private direction: Direction;

    constructor(
        collection: Iterable<Node<unknown>>,
        ref: HTMLElement | null,
        options?: ListDropTargetDelegateOptions
    ) {
        this.collection = collection;
        this.ref = ref;
        this.layout = options?.layout ?? 'stack';
        this.orientation = options?.orientation ?? 'vertical';
        this.direction = options?.direction ?? 'ltr';
    }

    private getPrimaryStart(rect: DOMRect) {
        return this.orientation === 'horizontal' ? rect.left : rect.top;
    }

    private getPrimaryEnd(rect: DOMRect) {
        return this.orientation === 'horizontal' ? rect.right : rect.bottom;
    }

    private getSecondaryStart(rect: DOMRect) {
        return this.orientation === 'horizontal' ? rect.top : rect.left;
    }

    private getSecondaryEnd(rect: DOMRect) {
        return this.orientation === 'horizontal' ? rect.bottom : rect.right;
    }

    private getFlowStart(rect: DOMRect) {
        return this.layout === 'stack' ? this.getPrimaryStart(rect) : this.getSecondaryStart(rect);
    }

    private getFlowEnd(rect: DOMRect) {
        return this.layout === 'stack' ? this.getPrimaryEnd(rect) : this.getSecondaryEnd(rect);
    }

    private getFlowSize(rect: DOMRect) {
        return this.getFlowEnd(rect) - this.getFlowStart(rect);
    }

    getDropTargetFromPoint(
        x: number,
        y: number,
        isValidDropTarget: (target: DropTarget) => boolean
    ): DropTarget {
        if (this.collection[Symbol.iterator]().next().done) {
            return { type: 'root' };
        }

        let rect = this.ref!.getBoundingClientRect();
        let primary = this.orientation === 'horizontal' ? x : y;
        let secondary = this.orientation === 'horizontal' ? y : x;
        primary += this.getPrimaryStart(rect);
        secondary += this.getSecondaryStart(rect);

        const flow = this.layout === 'stack' ? primary : secondary;
        const isPrimaryRTL = this.orientation === 'horizontal' && this.direction === 'rtl';
        const isSecondaryRTL =
            this.layout === 'grid' && this.orientation === 'vertical' && this.direction === 'rtl';
        const isFlowRTL = this.layout === 'stack' ? isPrimaryRTL : isSecondaryRTL;

        const elements = this.ref!.querySelectorAll('[data-key]');
        const elementMap = new Map<string, HTMLElement>();
        for (const item of elements) {
            if (item instanceof HTMLElement) {
                elementMap.set(item.dataset.key!, item);
            }
        }

        const items = [...this.collection].filter((item) => item.type === 'item');
        let low = 0;
        let high = items.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const item = items[mid];
            const element = elementMap.get(String(item.key));
            const rect = element!.getBoundingClientRect();
            const update = (isGreater: boolean) => {
                if (isGreater) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            };

            if (primary < this.getPrimaryStart(rect)) {
                update(isPrimaryRTL);
            } else if (primary > this.getPrimaryEnd(rect)) {
                update(!isPrimaryRTL);
            } else if (secondary < this.getSecondaryStart(rect)) {
                update(isSecondaryRTL);
            } else if (secondary > this.getSecondaryEnd(rect)) {
                update(!isSecondaryRTL);
            } else {
                const target: DropTarget = {
                    type: 'item',
                    key: item.key,
                    dropPosition: 'on'
                };

                if (isValidDropTarget(target)) {
                    if (
                        flow <= this.getFlowStart(rect) + 5 &&
                        isValidDropTarget({ ...target, dropPosition: 'before' })
                    ) {
                        target.dropPosition = isFlowRTL ? 'after' : 'before';
                    } else if (
                        flow >= this.getFlowEnd(rect) - 5 &&
                        isValidDropTarget({ ...target, dropPosition: 'after' })
                    ) {
                        target.dropPosition = isFlowRTL ? 'before' : 'after';
                    }
                } else {
                    const mid = this.getFlowStart(rect) + this.getFlowSize(rect) / 2;
                    if (flow <= mid && isValidDropTarget({ ...target, dropPosition: 'before' })) {
                        target.dropPosition = isFlowRTL ? 'after' : 'before';
                    } else if (
                        flow >= mid &&
                        isValidDropTarget({ ...target, dropPosition: 'after' })
                    ) {
                        target.dropPosition = isFlowRTL ? 'before' : 'after';
                    }
                }

                return target;
            }
        }

        const item = items[Math.min(low, items.length - 1)];
        const element = elementMap.get(String(item.key));
        rect = element!.getBoundingClientRect();

        if (
            primary < this.getPrimaryStart(rect) ||
            Math.abs(flow - this.getFlowStart(rect)) < Math.abs(flow - this.getFlowEnd(rect))
        ) {
            return {
                type: 'item',
                key: item.key,
                dropPosition: isFlowRTL ? 'after' : 'before'
            };
        }

        return {
            type: 'item',
            key: item.key,
            dropPosition: isFlowRTL ? 'before' : 'after'
        };
    }
}
