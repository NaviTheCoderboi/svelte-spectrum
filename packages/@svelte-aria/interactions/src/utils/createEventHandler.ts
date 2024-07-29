import type { BaseEvent } from '@svelte-types/shared';

function getAllProperties<T extends {}>(obj: T): any[] {
    const properties = new Set();
    let currentObj = obj;
    do {
        Object.getOwnPropertyNames(currentObj).forEach((prop) => properties.add(prop));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    } while ((currentObj = Object.getPrototypeOf(currentObj)));

    return Array.from(properties);
}

export const createEventHandler = <T extends Event>(
    handler?: (e: BaseEvent<T>) => void
): ((e: T) => void) | undefined => {
    if (!handler) {
        return undefined;
    }

    let shouldStopPropagation = true;
    return (e: T) => {
        const event: BaseEvent<T> = {
            // @ts-expect-error - This is a hack to get all properties of the event
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...(Object.fromEntries(getAllProperties(e).map((prop) => [prop, e[prop]])) as T),
            preventDefault() {
                e.preventDefault();
            },
            isDefaultPrevented() {
                return e.defaultPrevented;
            },
            stopPropagation() {
                console.error(
                    'stopPropagation is now the default behavior for events in Svelte Aria. You can use continuePropagation() to revert this behavior.'
                );
            },
            continuePropagation() {
                shouldStopPropagation = false;
            }
        };

        handler(event);

        if (shouldStopPropagation) {
            e.stopPropagation();
        }
    };
};
