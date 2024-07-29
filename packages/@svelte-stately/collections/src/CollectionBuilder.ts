import type { CollectionBase, CollectionElement, Key, Node } from '@svelte-types/shared';
import type { PartialNode } from './types';
import type { Component, Snippet } from 'svelte';

interface CollectionBuilderState {
    renderer?: Snippet<[{ item: any }]> | Component<{ item: any }>;
}

export class CollectionBuilder<T extends object> {
    private context?: unknown;
    private cache = new WeakMap<T, Node<T>>();

    build(props: CollectionBase<T>, context?: unknown) {
        this.context = context;
        return iterable(() => this.iterateCollection(props));
    }

    private *iterateCollection(props: CollectionBase<T>) {
        const { children, items } = props;

        if (typeof children === 'function') {
            if (!items) {
                throw new Error('props.children was a function but props.items is missing');
            }

            for (const item of props.items!) {
                yield* this.getFullNode(
                    {
                        value: item
                    },
                    { renderer: children }
                );
            }
        } else {
            const items: CollectionElement<T>[] = [];

            if (children instanceof Element) {
                items.push(children);
            } else {
                items.push(...children);
            }

            let index = 0;
            for (const item of items) {
                let nodes = this.getFullNode(
                    {
                        element: item,
                        index: index
                    },
                    {}
                );

                for (let node of nodes) {
                    index++;
                    yield node;
                }
            }
        }
    }

    private getKey(
        item: CollectionElement<T>,
        partialNode: PartialNode<T>,
        state: CollectionBuilderState,
        parentKey?: Key
    ): Key {
        if (item.key != null) {
            return item.key;
        }

        if (partialNode.type === 'cell' && partialNode.key != null) {
            return `${parentKey}${partialNode.key}`;
        }

        let v = partialNode.value as any;
        if (v != null) {
            let key = v.key ?? v.id;
            if (key == null) {
                throw new Error('No key found for item');
            }

            return key;
        }

        return parentKey ? `${parentKey}.${partialNode.index}` : `$.${partialNode.index}`;
    }

    private getChildState(state: CollectionBuilderState, partialNode: PartialNode<T>) {
        return {
            renderer: partialNode.renderer || state.renderer
        };
    }

    private *getFullNode(
        partialNode: PartialNode<T>,
        state: CollectionBuilderState,
        parentKey?: Key,
        parentNode?: Node<T>
    ): Generator<Node<T>> {
        let element = partialNode.element;
        if (!element && partialNode.value && state?.renderer) {
            const cached = this.cache.get(partialNode.value);
            if (cached && !cached.shouldInvalidate?.(this.context)) {
                cached.index = partialNode.index;
                cached.parentKey = parentNode ? parentNode.key : null;
                yield cached;
                return;
            }

            element = state.renderer(partialNode.value);
        }

        // If there's an element with a getCollectionNode function on its type, then it's a supported component.
        // Call this function to get a partial node, and recursively build a full node from there.
        if (React.isValidElement(element)) {
            let type = element.type as any;
            if (typeof type !== 'function' && typeof type.getCollectionNode !== 'function') {
                let name = typeof element.type === 'function' ? element.type.name : element.type;
                throw new Error(`Unknown element <${name}> in collection.`);
            }

            let childNodes = type.getCollectionNode(element.props, this.context) as Generator<
                PartialNode<T>,
                void,
                Node<T>[]
            >;
            let index = partialNode.index;
            let result = childNodes.next();
            while (!result.done && result.value) {
                let childNode = result.value;

                partialNode.index = index;

                let nodeKey = childNode.key;
                if (!nodeKey) {
                    nodeKey = childNode.element
                        ? null
                        : this.getKey(
                              element as CollectionElement<T>,
                              partialNode,
                              state,
                              parentKey
                          );
                }

                let nodes = this.getFullNode(
                    {
                        ...childNode,
                        key: nodeKey,
                        index,
                        wrapper: compose(partialNode.wrapper, childNode.wrapper)
                    },
                    this.getChildState(state, childNode),
                    parentKey ? `${parentKey}${element.key}` : element.key,
                    parentNode
                );

                let children = [...nodes];
                for (let node of children) {
                    // Cache the node based on its value
                    node.value = childNode.value || partialNode.value;
                    if (node.value) {
                        this.cache.set(node.value, node);
                    }

                    // The partial node may have specified a type for the child in order to specify a constraint.
                    // Verify that the full node that was built recursively matches this type.
                    if (partialNode.type && node.type !== partialNode.type) {
                        throw new Error(
                            `Unsupported type <${capitalize(node.type)}> in <${capitalize(parentNode.type)}>. Only <${capitalize(partialNode.type)}> is supported.`
                        );
                    }

                    index++;
                    yield node;
                }

                result = childNodes.next(children);
            }

            return;
        }

        // Ignore invalid elements
        if (partialNode.key == null) {
            return;
        }

        // Create full node
        let builder = this;
        let node: Node<T> = {
            type: partialNode.type,
            props: partialNode.props,
            key: partialNode.key,
            parentKey: parentNode ? parentNode.key : null,
            value: partialNode.value,
            level: parentNode ? parentNode.level + 1 : 0,
            index: partialNode.index,
            rendered: partialNode.rendered,
            textValue: partialNode.textValue,
            'aria-label': partialNode['aria-label'],
            wrapper: partialNode.wrapper,
            shouldInvalidate: partialNode.shouldInvalidate,
            hasChildNodes: partialNode.hasChildNodes,
            childNodes: iterable(function* () {
                if (!partialNode.hasChildNodes) {
                    return;
                }

                let index = 0;
                for (let child of partialNode.childNodes()) {
                    // Ensure child keys are globally unique by prepending the parent node's key
                    if (child.key != null) {
                        // TODO: Remove this line entirely and enforce that users always provide unique keys.
                        // Currently this line will have issues when a parent has a key `a` and a child with key `bc`
                        // but another parent has key `ab` and its child has a key `c`. The combined keys would result in both
                        // children having a key of `abc`.
                        child.key = `${node.key}${child.key}`;
                    }

                    child.index = index;
                    let nodes = builder.getFullNode(
                        child,
                        builder.getChildState(state, child),
                        node.key,
                        node
                    );
                    for (let node of nodes) {
                        index++;
                        yield node;
                    }
                }
            })
        };

        yield node;
    }
}

// Wraps an iterator function as an iterable object, and caches the results.
function iterable<T>(iterator: () => IterableIterator<Node<T>>): Iterable<Node<T>> {
    let cache = [];
    let iterable = null;
    return {
        *[Symbol.iterator]() {
            for (let item of cache) {
                yield item;
            }

            if (!iterable) {
                iterable = iterator();
            }

            for (let item of iterable) {
                cache.push(item);
                yield item;
            }
        }
    };
}

type Wrapper = Snippet | Component;
function compose(outer: Wrapper | void, inner: Wrapper | void): Wrapper {
    if (outer && inner) {
        return (element) => outer(inner(element));
    }

    if (outer) {
        return outer;
    }

    if (inner) {
        return inner;
    }
}

function capitalize(str: string) {
    return str[0].toUpperCase() + str.slice(1);
}
