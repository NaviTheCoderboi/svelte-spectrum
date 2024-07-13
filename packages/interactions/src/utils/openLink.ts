import { focusWithoutScrolling } from './focusWithoutScrolling';
import { isFirefox, isIPad, isMac, isWebKit } from './platform';

interface Modifiers {
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
}

export function openLink(target: HTMLAnchorElement, modifiers: Modifiers, setOpening = true) {
    let { metaKey, ctrlKey } = modifiers;
    const { altKey, shiftKey } = modifiers;

    if (isFirefox() && window.event?.type?.startsWith('key') && target.target === '_blank') {
        if (isMac()) {
            metaKey = true;
        } else {
            ctrlKey = true;
        }
    }

    const event =
        isWebKit() && isMac() && !isIPad() && process.env.NODE_ENV !== 'test'
            ? new KeyboardEvent('keydown', {
                  keyIdentifier: 'Enter',
                  metaKey,
                  ctrlKey,
                  altKey,
                  shiftKey
              })
            : new MouseEvent('click', {
                  metaKey,
                  ctrlKey,
                  altKey,
                  shiftKey,
                  bubbles: true,
                  cancelable: true
              });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (openLink as any).isOpening = setOpening;
    focusWithoutScrolling(target);
    target.dispatchEvent(event);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (openLink as any).isOpening = false;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(openLink as any).isOpening = false;
