import { getScrollParent, isIOS, isScrollable, isWebKit } from '@svelte-aria/utils';

const AUTOSCROLL_AREA_SIZE = 20;

export const useAutoScroll = (ref: Element | null) => {
    let scrollableRef: Element | null = null;
    let scrollableX = true;
    let scrollableY = true;
    $effect(() => {
        if (ref) {
            scrollableRef = isScrollable(ref) ? ref : getScrollParent(ref);
            const style = window.getComputedStyle(scrollableRef);
            scrollableX = /(auto|scroll)/.test(style.overflowX);
            scrollableY = /(auto|scroll)/.test(style.overflowY);
        }
    });

    const state: {
        timer: number | null;
        dx: number;
        dy: number;
    } = {
        timer: null,
        dx: 0,
        dy: 0
    };

    $effect(() => {
        return () => {
            if (state.timer) {
                cancelAnimationFrame(state.timer);
                state.timer = null;
            }
        };
    });

    const scroll = () => {
        if (scrollableX && scrollableRef) {
            scrollableRef.scrollLeft += state.dx;
        }
        if (scrollableY && scrollableRef) {
            scrollableRef.scrollTop += state.dy;
        }

        if (state.timer) {
            state.timer = requestAnimationFrame(scroll);
        }
    };

    return {
        move(x: number, y: number) {
            if (!isWebKit() || isIOS() || !scrollableRef) {
                return;
            }

            const box = scrollableRef.getBoundingClientRect();
            const left = AUTOSCROLL_AREA_SIZE;
            const top = AUTOSCROLL_AREA_SIZE;
            const bottom = box.height - AUTOSCROLL_AREA_SIZE;
            const right = box.width - AUTOSCROLL_AREA_SIZE;
            if (x < left || x > right || y < top || y > bottom) {
                if (x < left) {
                    state.dx = x - left;
                } else if (x > right) {
                    state.dx = x - right;
                }
                if (y < top) {
                    state.dy = y - top;
                } else if (y > bottom) {
                    state.dy = y - bottom;
                }

                if (!state.timer) {
                    state.timer = requestAnimationFrame(scroll);
                }
            } else {
                this.stop();
            }
        },
        stop() {
            if (state.timer) {
                cancelAnimationFrame(state.timer);
                state.timer = null;
            }
        }
    };
};
