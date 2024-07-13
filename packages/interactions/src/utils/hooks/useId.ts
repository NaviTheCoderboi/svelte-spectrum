const idsUpdaterMap = new Map<string, (v: string) => void>();

export function mergeIds(idA: string, idB: string): string {
    if (idA === idB) {
        return idA;
    }

    const setIdA = idsUpdaterMap.get(idA);
    if (setIdA) {
        setIdA(idB);
        return idB;
    }

    const setIdB = idsUpdaterMap.get(idB);
    if (setIdB) {
        setIdB(idA);
        return idA;
    }

    return idB;
}
