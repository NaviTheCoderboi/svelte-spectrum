import type { FocusableElement } from '@svelte-types/shared';

interface ScrollableElement {
    element: HTMLElement;
    scrollTop: number;
    scrollLeft: number;
}

export const focusWithoutScrolling = (element: FocusableElement) => {
    if (supportsPreventScroll()) {
        element.focus({ preventScroll: true });
    } else {
        const scrollableElements = getScrollableElements(element);
        element.focus();
        restoreScrollPosition(scrollableElements);
    }
};

let supportsPreventScrollCached: boolean | null = null;
const supportsPreventScroll = () => {
    if (supportsPreventScrollCached == null) {
        supportsPreventScrollCached = false;
        try {
            const focusElem = document.createElement('div');
            focusElem.focus({
                get preventScroll() {
                    supportsPreventScrollCached = true;
                    return true;
                }
            });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
            // Ignore
        }
    }

    return supportsPreventScrollCached;
};

const getScrollableElements = (element: FocusableElement): ScrollableElement[] => {
    let parent = element.parentNode;
    const scrollableElements: ScrollableElement[] = [];
    const rootScrollingElement = document.scrollingElement ?? document.documentElement;

    while (parent instanceof HTMLElement && parent !== rootScrollingElement) {
        if (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) {
            scrollableElements.push({
                element: parent,
                scrollTop: parent.scrollTop,
                scrollLeft: parent.scrollLeft
            });
        }
        parent = parent.parentNode;
    }

    if (rootScrollingElement instanceof HTMLElement) {
        scrollableElements.push({
            element: rootScrollingElement,
            scrollTop: rootScrollingElement.scrollTop,
            scrollLeft: rootScrollingElement.scrollLeft
        });
    }

    return scrollableElements;
};

const restoreScrollPosition = (scrollableElements: ScrollableElement[]) => {
    for (const { element, scrollTop, scrollLeft } of scrollableElements) {
        element.scrollTop = scrollTop;
        element.scrollLeft = scrollLeft;
    }
};
