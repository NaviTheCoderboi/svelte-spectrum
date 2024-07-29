import type { DropOperation } from '@svelte-types/shared';

export const CUSTOM_DRAG_TYPE = 'application/vnd.svelte-aria.items+json';
export const GENERIC_TYPE = 'application/octet-stream';
export const NATIVE_DRAG_TYPES = new Set(['text/plain', 'text/uri-list', 'text/html']);

export enum DROP_OPERATION {
    none = 0,
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
    cancel = 0,
    move = 1 << 0,
    copy = 1 << 1,
    link = 1 << 2,
    all = move | copy | link
}

export const DROP_OPERATION_ALLOWED = {
    ...DROP_OPERATION,
    copyMove: DROP_OPERATION.copy | DROP_OPERATION.move,
    copyLink: DROP_OPERATION.copy | DROP_OPERATION.link,
    linkMove: DROP_OPERATION.link | DROP_OPERATION.move,
    all: DROP_OPERATION.all,
    uninitialized: DROP_OPERATION.all
};

const invert = <K extends keyof any, T extends keyof any>(object: Record<K, T>): Record<T, K> => {
    const res = {};
    for (const key in object) {
        // @ts-expect-error - ignore it
        res[object[key]] = key;
    }

    return res as Record<T, K>;
};

export const EFFECT_ALLOWED = invert(DROP_OPERATION_ALLOWED);
EFFECT_ALLOWED[DROP_OPERATION.all] = 'all';

export const DROP_EFFECT_TO_DROP_OPERATION: Record<string, DropOperation> = {
    none: 'cancel',
    link: 'link',
    copy: 'copy',
    move: 'move'
};

export const DROP_OPERATION_TO_DROP_EFFECT = invert(DROP_EFFECT_TO_DROP_OPERATION);
