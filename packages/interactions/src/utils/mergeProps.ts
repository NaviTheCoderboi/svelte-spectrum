import clsx from 'clsx';
import { chain } from './chain';
import { mergeIds } from './hooks/useId';

type Props = Record<string, any>;

type PropsArg = Props | null | undefined;

type TupleTypes<T> =
    {
        [P in keyof T]: T[P];
    } extends Record<number, infer V>
        ? NullToObject<V>
        : never;

type NullToObject<T> = T extends null | undefined ? {} : T;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;

export const mergeProps = <T extends PropsArg[]>(
    ...args: T
): UnionToIntersection<TupleTypes<T>> => {
    const result: Props = { ...args[0] };

    for (const props of args) {
        for (const key in props) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const a = result[key];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const b = props[key];

            if (typeof a === 'function' && typeof b === 'function' && key.startsWith('on')) {
                result[key] = chain(a as CallableFunction, b as CallableFunction);
            } else if (key === 'class' && typeof a === 'string' && typeof b === 'string') {
                result[key] = clsx(a, b);
            } else if (key === 'id' && typeof a === 'string' && typeof b === 'string') {
                result.id = mergeIds(a, b);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                result[key] = b !== undefined ? b : a;
            }
        }
    }

    return result as UnionToIntersection<TupleTypes<T>>;
};
