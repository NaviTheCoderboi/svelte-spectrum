import type {
    Collection,
    DraggableCollectionEndEvent,
    DraggableCollectionProps,
    DragItem,
    DragMoveEvent,
    DragStartEvent,
    DropOperation,
    Key,
    Node
} from '@svelte-types/shared';
import { MultipleSelectionManager } from '@react-stately/selection';

export interface DraggableCollectionStateOptions extends DraggableCollectionProps {
    /** A collection of items. */
    collection: Collection<Node<unknown>>;
    /** An interface for reading and updating multiple selection state. */
    selectionManager: MultipleSelectionManager;
    /** Whether the drag events should be disabled. */
    isDisabled?: boolean;
}

export interface DraggableCollectionState {
    /** A collection of items. */
    collection: Collection<Node<unknown>>;
    /** An interface for reading and updating multiple selection state. */
    selectionManager: MultipleSelectionManager;
    /** The key of the item that initiated a drag. */
    draggedKey: Key | null;
    /** The keys of the items that are currently being dragged. */
    draggingKeys: Set<Key>;
    /** Whether drag events are disabled. */
    isDisabled?: boolean;
    /** Returns whether the given key is currently being dragged. */
    isDragging(key: Key): boolean;
    /** Returns the keys of the items that will be dragged with the given key (e.g. selected items). */
    getKeysForDrag(key: Key): Set<Key>;
    /** Returns the items to drag for the given key. */
    getItems(key: Key): DragItem[];
    /** The ref of the element that will be rendered as the drag preview while dragging. */
    preview?: RefObject<DragPreviewRenderer | null>;
    /** Function that returns the drop operations that are allowed for the dragged items. If not provided, all drop operations are allowed. */
    getAllowedDropOperations?: () => DropOperation[];
    /** Begins a drag for the given key. This triggers the onDragStart event. */
    startDrag(key: Key, event: DragStartEvent): void;
    /** Triggers an onDragMove event. */
    moveDrag(event: DragMoveEvent): void;
    /** Ends the current drag, and emits an onDragEnd event. */
    endDrag(event: DraggableCollectionEndEvent): void;
}

/**
 * Manages state for a draggable collection.
 */
export function useDraggableCollectionState(
    props: DraggableCollectionStateOptions
): DraggableCollectionState {
    let {
        getItems,
        isDisabled,
        collection,
        selectionManager,
        onDragStart,
        onDragMove,
        onDragEnd,
        preview,
        getAllowedDropOperations
    } = props;
    let [, setDragging] = useState(false);
    let draggingKeys = useRef(new Set<Key>());
    let draggedKey = useRef(null);
    let getKeys = (key: Key) => {
        // The clicked item is always added to the drag. If it is selected, then all of the
        // other selected items are also dragged. If it is not selected, the only the clicked
        // item is dragged. This matches native macOS behavior.
        let keys = new Set(
            selectionManager.isSelected(key)
                ? new Set(
                      [...selectionManager.selectedKeys].filter((key) => !!collection.getItem(key))
                  )
                : []
        );

        keys.add(key);
        return keys;
    };

    return {
        collection,
        selectionManager,
        get draggedKey() {
            return draggedKey.current;
        },
        get draggingKeys() {
            return draggingKeys.current;
        },
        isDragging(key) {
            return draggingKeys.current.has(key);
        },
        getKeysForDrag: getKeys,
        getItems(key) {
            return getItems(getKeys(key));
        },
        isDisabled,
        preview,
        getAllowedDropOperations,
        startDrag(key, event) {
            let keys = getKeys(key);
            draggingKeys.current = keys;
            draggedKey.current = key;
            selectionManager.setFocused(false);
            setDragging(true);
            if (typeof onDragStart === 'function') {
                onDragStart({
                    ...event,
                    keys
                });
            }
        },
        moveDrag(event) {
            if (typeof onDragMove === 'function') {
                onDragMove({
                    ...event,
                    keys: draggingKeys.current
                });
            }
        },
        endDrag(event) {
            let { isInternal } = event;

            if (typeof onDragEnd === 'function') {
                onDragEnd({
                    ...event,
                    keys: draggingKeys.current,
                    isInternal
                });
            }

            draggingKeys.current = new Set();
            draggedKey.current = null;
            setDragging(false);
        }
    };
}
