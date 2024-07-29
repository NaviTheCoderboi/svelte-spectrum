import type { Key } from '@svelte-types/shared';
import type { Component, Snippet } from 'svelte';

export interface PartialNode<T> {
    type?: string;
    key?: Key;
    value?: T;
    element?: HTMLElement | Component;
    wrapper?:
        | Snippet<
              [
                  {
                      element: HTMLElement | Component;
                  }
              ]
          >
        | Component<{
              element: HTMLElement | Component;
          }>;
    rendered?: HTMLElement;
    textValue?: string;
    'aria-label'?: string;
    index?: number;
    renderer?:
        | Snippet<
              [
                  {
                      item: T;
                  }
              ]
          >
        | Component<{ item: T }>;
    hasChildNodes?: boolean;
    childNodes?: () => IterableIterator<PartialNode<T>>;
    props?: any;
    shouldInvalidate?: (context: unknown) => boolean;
}
