const transitionsByElement = new Map<EventTarget, Set<string>>();
const transitionCallbacks = new Set<() => void>();

function setupGlobalEvents() {
    if (typeof window === 'undefined') {
        return;
    }

    function isTransitionEvent(event: Event): event is TransitionEvent {
        return 'propertyName' in event;
    }

    const onTransitionStart = (e: Event) => {
        if (!isTransitionEvent(e) || !e.target) {
            return;
        }
        let transitions = transitionsByElement.get(e.target);
        if (!transitions) {
            transitions = new Set();
            transitionsByElement.set(e.target, transitions);

            e.target.addEventListener('transitioncancel', onTransitionEnd, {
                once: true
            });
        }

        transitions.add(e.propertyName);
    };

    const onTransitionEnd = (e: Event) => {
        if (!isTransitionEvent(e) || !e.target) {
            return;
        }
        const properties = transitionsByElement.get(e.target);
        if (!properties) {
            return;
        }

        properties.delete(e.propertyName);

        if (properties.size === 0) {
            e.target.removeEventListener('transitioncancel', onTransitionEnd);
            transitionsByElement.delete(e.target);
        }

        if (transitionsByElement.size === 0) {
            for (const cb of transitionCallbacks) {
                cb();
            }

            transitionCallbacks.clear();
        }
    };

    document.body.addEventListener('transitionrun', onTransitionStart);
    document.body.addEventListener('transitionend', onTransitionEnd);
}

if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') {
        setupGlobalEvents();
    } else {
        document.addEventListener('DOMContentLoaded', setupGlobalEvents);
    }
}

export function runAfterTransition(fn: () => void) {
    requestAnimationFrame(() => {
        if (transitionsByElement.size === 0) {
            fn();
        } else {
            transitionCallbacks.add(fn);
        }
    });
}
