const refCountMap = new WeakMap<Element, number>();
const observerStack: {
    observe(): void;
    disconnect(): void;
}[] = [];

export const ariaHideOutside = (targets: Element[], root = document.body) => {
    const visibleNodes = new Set<Element>(targets);
    const hiddenNodes = new Set<Element>();

    const walk = (root: Element) => {
        for (const element of root.querySelectorAll(
            '[data-live-announcer], [data-svelte-aria-top-layer]'
        )) {
            visibleNodes.add(element);
        }

        const acceptNode = (node: Element) => {
            if (
                visibleNodes.has(node) ||
                (hiddenNodes.has(node.parentElement!) &&
                    node?.parentElement?.getAttribute('role') !== 'row')
            ) {
                return NodeFilter.FILTER_REJECT;
            }

            for (const target of visibleNodes) {
                if (node.contains(target)) {
                    return NodeFilter.FILTER_SKIP;
                }
            }

            return NodeFilter.FILTER_ACCEPT;
        };

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, { acceptNode });

        const acceptRoot = acceptNode(root);
        if (acceptRoot === NodeFilter.FILTER_ACCEPT) {
            hide(root);
        }

        if (acceptRoot !== NodeFilter.FILTER_REJECT) {
            let node = walker.nextNode() as Element;
            while (node != null) {
                hide(node);
                node = walker.nextNode() as Element;
            }
        }
    };

    const hide = (node: Element) => {
        const refCount = refCountMap.get(node) ?? 0;

        if (node.getAttribute('aria-hidden') === 'true' && refCount === 0) {
            return;
        }

        if (refCount === 0) {
            node.setAttribute('aria-hidden', 'true');
        }

        hiddenNodes.add(node);
        refCountMap.set(node, refCount + 1);
    };

    if (observerStack.length) {
        observerStack[observerStack.length - 1].disconnect();
    }

    walk(root);

    const observer = new MutationObserver((changes) => {
        for (const change of changes) {
            if (change.type !== 'childList' || change.addedNodes.length === 0) {
                continue;
            }

            if (![...visibleNodes, ...hiddenNodes].some((node) => node.contains(change.target))) {
                for (const node of change.removedNodes) {
                    if (node instanceof Element) {
                        visibleNodes.delete(node);
                        hiddenNodes.delete(node);
                    }
                }

                for (const node of change.addedNodes) {
                    if (
                        (node instanceof HTMLElement || node instanceof SVGElement) &&
                        (node.dataset.liveAnnouncer === 'true' ||
                            node.dataset.svelteAriaTopLayer === 'true')
                    ) {
                        visibleNodes.add(node);
                    } else if (node instanceof Element) {
                        walk(node);
                    }
                }
            }
        }
    });

    observer.observe(root, { childList: true, subtree: true });

    const observerWrapper = {
        observe() {
            observer.observe(root, { childList: true, subtree: true });
        },
        disconnect() {
            observer.disconnect();
        }
    };

    observerStack.push(observerWrapper);

    return () => {
        observer.disconnect();

        for (const node of hiddenNodes) {
            const count = refCountMap.get(node);
            if (count === 1) {
                node.removeAttribute('aria-hidden');
                refCountMap.delete(node);
            } else {
                refCountMap.set(node, count! - 1);
            }
        }

        if (observerWrapper === observerStack[observerStack.length - 1]) {
            observerStack.pop();
            if (observerStack.length) {
                observerStack[observerStack.length - 1].observe();
            }
        } else {
            observerStack.splice(observerStack.indexOf(observerWrapper), 1);
        }
    };
};
