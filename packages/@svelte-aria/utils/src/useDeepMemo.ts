export function useDeepMemo<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
    let lastValue: T | null = null;
    if (value && lastValue && isEqual(value, lastValue)) {
        value = lastValue;
    }

    lastValue = value;
    return value;
}
