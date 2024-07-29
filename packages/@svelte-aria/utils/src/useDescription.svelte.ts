import type { AriaLabelingProps } from '@svelte-types/shared';

let descriptionId = 0;
const descriptionNodes = new Map<string, { refCount: number; element: Element }>();

export const useDescription = (description?: string): AriaLabelingProps => {
    let id = $state<string | undefined>();

    if (typeof document !== 'undefined') {
        $effect.pre(() => {
            if (!description) {
                return;
            }

            let desc = descriptionNodes.get(description);
            if (!desc) {
                const _id = `svelte-aria-description-${descriptionId++}`;
                id = _id;

                const node = document.createElement('div');
                node.id = _id;
                node.style.display = 'none';
                node.textContent = description;
                document.body.appendChild(node);
                desc = { refCount: 0, element: node };
                descriptionNodes.set(description, desc);
            } else {
                id = desc.element.id;
            }

            desc.refCount++;

            return () => {
                if (desc && --desc.refCount === 0) {
                    desc.element.remove();
                    descriptionNodes.delete(description);
                }
            };
        });
    }

    return {
        'aria-describedby': description ? id : undefined
    };
};
