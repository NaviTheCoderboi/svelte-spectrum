import type {
    AriaAttributes,
    AriaRole,
    HTMLAttributeAnchorTarget,
    DOMAttributes as SvelteDOMAttributes
} from 'svelte/elements';

export interface FocusableElement extends HTMLElement, HTMLOrSVGElement {}

export interface RouterConfig {}

export type Href = RouterConfig extends { href: infer H } ? H : string;

export type RouterOptions = RouterConfig extends { routerOptions: infer O } ? O : never;

export type HTMLAttributeReferrerPolicy =
    | ''
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

export interface LinkDOMProps {
    href?: Href;
    hrefLang?: string;
    target?: HTMLAttributeAnchorTarget;
    rel?: string;
    download?: boolean | string;
    ping?: string;
    referrerPolicy?: HTMLAttributeReferrerPolicy;
    routerOptions?: RouterOptions;
}

export interface DOMAttributes<T extends EventTarget = FocusableElement>
    extends AriaAttributes,
        SvelteDOMAttributes<T> {
    id?: string | undefined;
    role?: AriaRole | undefined;
    tabIndex?: number | undefined;
    style?: string | undefined;
    className?: string | undefined;
}
