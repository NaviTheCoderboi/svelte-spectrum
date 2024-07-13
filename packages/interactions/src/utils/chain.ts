export function chain(...callbacks: CallableFunction[]): (...args: any[]) => void {
    return (...args: any[]) => {
        for (const callback of callbacks) {
            if (typeof callback === 'function') {
                callback(...args);
            }
        }
    };
}
