import type { DirectoryDropItem, DragItem, DropItem, FileDropItem } from '@svelte-types/shared';
import { CUSTOM_DRAG_TYPE, DROP_OPERATION, GENERIC_TYPE, NATIVE_DRAG_TYPES } from './constants';
import { getInteractionModality, useInteractionModality } from '@svelte-aria/interactions';

export function writeToDataTransfer(dataTransfer: DataTransfer, items: DragItem[]) {
    const groupedByType = new Map<string, string[]>();
    let needsCustomData = false;
    const customData = [];
    for (const item of items) {
        const types = Object.keys(item);
        if (types.length > 1) {
            needsCustomData = true;
        }

        const dataByType: Record<string, string> = {};
        for (const type of types) {
            let typeItems = groupedByType.get(type);
            if (!typeItems) {
                typeItems = [];
                groupedByType.set(type, typeItems);
            } else {
                needsCustomData = true;
            }

            const data = item[type];
            dataByType[type] = data;
            typeItems.push(data);
        }

        customData.push(dataByType);
    }

    for (const [type, items] of groupedByType) {
        if (NATIVE_DRAG_TYPES.has(type)) {
            const data = items.join('\n');
            dataTransfer.items.add(data, type);
        } else {
            dataTransfer.items.add(items[0], type);
        }
    }

    if (needsCustomData) {
        const data = JSON.stringify(customData);
        dataTransfer.items.add(data, CUSTOM_DRAG_TYPE);
    }
}

export const readFromDataTransfer = (dataTransfer: DataTransfer) => {
    const items: DropItem[] = [];

    let hasCustomType = false;
    if (dataTransfer.types.includes(CUSTOM_DRAG_TYPE)) {
        try {
            const data = dataTransfer.getData(CUSTOM_DRAG_TYPE);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed = JSON.parse(data);
            for (const item of parsed) {
                items.push({
                    kind: 'text',
                    types: new Set(Object.keys(item)),
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    getText: (type) => Promise.resolve(item[type])
                });
            }

            hasCustomType = true;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            // ignore
        }
    }

    if (!hasCustomType) {
        const stringItems = new Map();
        for (const item of dataTransfer.items) {
            if (item.kind === 'string') {
                stringItems.set(item.type || GENERIC_TYPE, dataTransfer.getData(item.type));
            } else if (item.kind === 'file') {
                if (typeof item.webkitGetAsEntry === 'function') {
                    const entry: FileSystemEntry = item.webkitGetAsEntry()!;
                    if (!entry) {
                        continue;
                    }

                    if (entry.isFile) {
                        items.push(createFileItem(item.getAsFile()!));
                    } else if (entry.isDirectory) {
                        items.push(createDirectoryItem(entry));
                    }
                } else {
                    items.push(createFileItem(item.getAsFile()!));
                }
            }
        }

        if (stringItems.size > 0) {
            items.push({
                kind: 'text',
                types: new Set<string>(stringItems.keys()),
                getText: (type) => Promise.resolve(stringItems.get(type))
            });
        }
    }

    return items;
};

const blobToString = (blob: Blob): Promise<string> => {
    if (typeof blob.text === 'function') {
        return blob.text();
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };

        reader.onerror = reject;
        reader.readAsText(blob);
    });
};

const createFileItem = (file: File): FileDropItem => {
    return {
        kind: 'file',
        type: file.type || GENERIC_TYPE,
        name: file.name,
        getText: () => blobToString(file),
        getFile: () => Promise.resolve(file)
    };
};

const createDirectoryItem = (entry: FileSystemEntry): DirectoryDropItem => {
    return {
        kind: 'directory',
        name: entry.name,
        // @ts-expect-error - ignore it
        getEntries: () => getEntries(entry)
    };
};

async function* getEntries(
    item: FileSystemDirectoryEntry
): AsyncIterable<FileDropItem | DirectoryDropItem> {
    const reader = item.createReader();

    let entries: FileSystemEntry[];
    do {
        entries = await new Promise((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });

        for (const entry of entries) {
            if (entry.isFile) {
                const file = await getEntryFile(entry as FileSystemFileEntry);
                yield createFileItem(file);
            } else if (entry.isDirectory) {
                yield createDirectoryItem(entry);
            }
        }
    } while (entries.length > 0);
}

const getEntryFile = (entry: FileSystemFileEntry): Promise<File> => {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
};

export let globalAllowedDropOperations = DROP_OPERATION.none;
export const setGlobalAllowedDropOperations = (o: DROP_OPERATION) => {
    globalAllowedDropOperations = o;
};

type DropEffect = 'none' | 'copy' | 'link' | 'move' | undefined;
export let globalDropEffect: DropEffect;
export const setGlobalDropEffect = (dropEffect?: DropEffect) => {
    globalDropEffect = dropEffect;
};

const mapModality = (modality: string) => {
    if (!modality) {
        modality = 'virtual';
    }

    if (modality === 'pointer') {
        modality = 'virtual';
    }

    if (modality === 'virtual' && typeof window !== 'undefined' && 'ontouchstart' in window) {
        modality = 'touch';
    }

    return modality;
};

export const useDragModality = () => {
    return mapModality(useInteractionModality()!);
};

export const getDragModality = () => {
    return mapModality(getInteractionModality()!);
};

export const getTypes = (items: DragItem[]): Set<string> => {
    const types = new Set<string>();
    for (const item of items) {
        for (const type of Object.keys(item)) {
            types.add(type);
        }
    }

    return types;
};
