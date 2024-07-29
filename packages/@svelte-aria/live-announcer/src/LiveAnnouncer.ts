type Assertiveness = 'assertive' | 'polite';

const LIVEREGION_TIMEOUT_DELAY = 7000;

let liveAnnouncer: LiveAnnouncer | null = null;

export function announce(
    message: string,
    assertiveness: Assertiveness = 'assertive',
    timeout = LIVEREGION_TIMEOUT_DELAY
) {
    if (!liveAnnouncer) {
        liveAnnouncer = new LiveAnnouncer();
    }

    liveAnnouncer.announce(message, assertiveness, timeout);
}

export function clearAnnouncer(assertiveness: Assertiveness) {
    if (liveAnnouncer) {
        liveAnnouncer.clear(assertiveness);
    }
}

export function destroyAnnouncer() {
    if (liveAnnouncer) {
        liveAnnouncer.destroy();
        liveAnnouncer = null;
    }
}

class LiveAnnouncer {
    node: HTMLElement | null;
    assertiveLog: HTMLElement;
    politeLog: HTMLElement;

    constructor() {
        this.node = document.createElement('div');
        this.node.dataset.liveAnnouncer = 'true';
        Object.assign(this.node.style, {
            border: 0,
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            height: '1px',
            margin: '-1px',
            overflow: 'hidden',
            padding: 0,
            position: 'absolute',
            width: '1px',
            whiteSpace: 'nowrap'
        });

        this.assertiveLog = this.createLog('assertive');
        this.node.appendChild(this.assertiveLog);

        this.politeLog = this.createLog('polite');
        this.node.appendChild(this.politeLog);

        document.body.prepend(this.node);
    }

    createLog(ariaLive: string) {
        const node = document.createElement('div');
        node.setAttribute('role', 'log');
        node.setAttribute('aria-live', ariaLive);
        node.setAttribute('aria-relevant', 'additions');
        return node;
    }

    destroy() {
        if (!this.node) {
            return;
        }

        document.body.removeChild(this.node);
        this.node = null;
    }

    announce(message: string, assertiveness = 'assertive', timeout = LIVEREGION_TIMEOUT_DELAY) {
        if (!this.node) {
            return;
        }

        const node = document.createElement('div');
        node.textContent = message;

        if (assertiveness === 'assertive') {
            this.assertiveLog.appendChild(node);
        } else {
            this.politeLog.appendChild(node);
        }

        if (message !== '') {
            setTimeout(() => {
                node.remove();
            }, timeout);
        }
    }

    clear(assertiveness: Assertiveness) {
        if (!this.node) {
            return;
        }

        if (!assertiveness || assertiveness === 'assertive') {
            this.assertiveLog.innerHTML = '';
        }

        if (!assertiveness || assertiveness === 'polite') {
            this.politeLog.innerHTML = '';
        }
    }
}
