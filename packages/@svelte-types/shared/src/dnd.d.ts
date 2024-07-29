import type { Key } from './key';

export interface TextDropItem {
    kind: 'text';
    types: Set<string>;
    getText(type: string): Promise<string>;
}

export interface FileDropItem {
    kind: 'file';
    type: string;
    name: string;
    getFile(): Promise<File>;
    getText(): Promise<string>;
}

export interface DirectoryDropItem {
    kind: 'directory';
    name: string;
    getEntries(): AsyncIterable<FileDropItem | DirectoryDropItem>;
}

export type DropItem = TextDropItem | FileDropItem | DirectoryDropItem;

export interface DragItem {
    [type: string]: string;
}

export interface DragDropEvent {
    x: number;
    y: number;
}

export type DropOperation = 'copy' | 'link' | 'move' | 'cancel';

export interface DragStartEvent extends DragDropEvent {
    type: 'dragstart';
}

export interface DragMoveEvent extends DragDropEvent {
    type: 'dragmove';
}

export interface DragEndEvent extends DragDropEvent {
    type: 'dragend';
    dropOperation: DropOperation;
}

export interface DropActivateEvent extends DragDropEvent {
    type: 'dropactivate';
}

export interface DropEnterEvent extends DragDropEvent {
    type: 'dropenter';
}

export interface DropEvent extends DragDropEvent {
    type: 'drop';
    dropOperation: DropOperation;
    items: DropItem[];
}

export interface DropExitEvent extends DragDropEvent {
    type: 'dropexit';
}

export type DropPosition = 'on' | 'before' | 'after';
export interface RootDropTarget {
    type: 'root';
}

export interface ItemDropTarget {
    type: 'item';
    key: Key;
    dropPosition: DropPosition;
}

export type DropTarget = RootDropTarget | ItemDropTarget;

export interface DropTargetDelegate {
    getDropTargetFromPoint(
        x: number,
        y: number,
        isValidDropTarget: (target: DropTarget) => boolean
    ): DropTarget | null;
}

export interface DraggableCollectionEndEvent extends DragEndEvent {
    keys: Set<Key>;
    isInternal: boolean;
}

export interface DraggableCollectionStartEvent extends DragStartEvent {
    keys: Set<Key>;
}

export interface DraggableCollectionMoveEvent extends DragMoveEvent {
    keys: Set<Key>;
}

export interface DraggableCollectionProps {
    onDragStart?: (e: DraggableCollectionStartEvent) => void;
    onDragMove?: (e: DraggableCollectionMoveEvent) => void;
    onDragEnd?: (e: DraggableCollectionEndEvent) => void;
    getItems: (keys: Set<Key>) => DragItem[];
    getAllowedDropOperations?: () => DropOperation[];
}
