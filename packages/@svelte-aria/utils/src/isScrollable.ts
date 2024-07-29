export const isScrollable = (node: Element, checkForOverflow?: boolean): boolean => {
    const style = window.getComputedStyle(node);
    let isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);

    if (isScrollable && checkForOverflow) {
        isScrollable =
            node.scrollHeight !== node.clientHeight || node.scrollWidth !== node.clientWidth;
    }

    return isScrollable;
};
