import type { Component, Snippet } from 'svelte';
import type { Key } from './key';
import type { LinkDOMProps } from './dom';

export interface Collection<T> extends Iterable<T> {
    readonly size: number;
    getKeys(): Iterable<Key>;
    getItem(key: Key): T | null;
    at(idx: number): T | null;
    getKeyBefore(key: Key): Key | null;
    getKeyAfter(key: Key): Key | null;
    getFirstKey(): Key | null;
    getLastKey(): Key | null;
    getChildren?(key: Key): Iterable<T>;
    getTextValue?(key: Key): string;
}

export interface Node<T> {
    type: string;
    key: Key;
    value: T | null;
    level: number;
    hasChildNodes: boolean;
    rendered: HTMLElement | null;
    textValue: string;
    'aria-label'?: string;
    index?: number;
    parentKey?: Key | null;
    prevKey?: Key | null;
    nextKey?: Key | null;
    props?: any;
    render: Snippet | Component;
    shouldInvalidate?: (context: unknown) => boolean;
}

export interface ItemProps<T> extends LinkDOMProps {
    children: Snippet;
    title?: string | HTMLElement;
    textValue?: string;
    'aria-label'?: string;
    childItems?: Iterable<T>;
    hasChildItems?: boolean;
}

export type ItemElement<T> = Component<ItemProps<T>> | HTMLElement;
export type ItemRenderer<T> = Snippet<[{ item: T }]> | Component<{ item: T }>;

export interface SectionProps<T> {
    title?: string | HTMLElement;
    'aria-label'?: string;
    children: ItemElement<T> | ItemElement<T>[] | ItemRenderer<T>;
    items?: Iterable<T>;
}

export type SectionElement<T> = Component<SectionProps<T>>;

export type CollectionElement<T> = SectionElement<T> | ItemElement<T>;

export type CollectionChildren<T> =
    | CollectionElement<T>
    | CollectionElement<T>[]
    | Snippet<
          [
              {
                  item: T;
              }
          ]
      >;

export interface CollectionBase<T> {
    children: CollectionChildren<T>;
    items?: Iterable<T>;
    disabledKeys?: Iterable<Key>;
}
