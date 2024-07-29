import { isScrollable } from './isScrollable';

export const getScrollParent = (node: Element, checkForOverflow?: boolean): Element => {
    let scrollableNode: Element | null = node;
    if (isScrollable(scrollableNode, checkForOverflow)) {
        scrollableNode = scrollableNode.parentElement;
    }

    while (scrollableNode && !isScrollable(scrollableNode, checkForOverflow)) {
        scrollableNode = scrollableNode.parentElement;
    }

    return scrollableNode ?? document.scrollingElement ?? document.documentElement;
};
