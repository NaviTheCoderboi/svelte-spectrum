import { DOMAttributes } from 'svelte/elements';

interface HoverEventContext {
    type: 'hoverstart' | 'hoverend';
    pointerType: 'mouse' | 'pen' | 'touch' | '';
    target: HTMLElement;
}
interface HoverEvents {
    onHoverStart?: (event: HoverEventContext) => void;
    onHoverEnd?: (event: HoverEventContext) => void;
    onHoverChange?: (isHovered: boolean) => void;
}
interface HoverProps extends HoverEvents {
    isDisabled?: boolean;
}
interface HoverResult<T extends HTMLElement> {
    hoverProps: () => DOMAttributes<T>;
    isHovered: () => boolean;
}
declare const useHover: <T extends HTMLElement>(props?: HoverProps) => HoverResult<T>;

export { type HoverEventContext, type HoverEvents, type HoverProps, type HoverResult, useHover };
