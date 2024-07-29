import { useEffectEvent } from '@svelte-aria/utils';
import type { FocusableElement, SFocusEvent } from '@svelte-types/shared';

export const useSyntheticBlurEvent = <T extends FocusableElement = FocusableElement>(
    onBlur: (e: SFocusEvent<T>) => void
) => {
    const stateRef = {
        isFocused: false,
        observer: null as MutationObserver | null
    };

    if (typeof window !== 'undefined') {
        $effect.pre(() => {
            const state = stateRef;
            return () => {
                if (state.observer) {
                    state.observer.disconnect();
                    state.observer = null;
                }
            };
        });
    }

    const dispatchBlur = useEffectEvent((e: SFocusEvent<T>) => {
        onBlur?.(e);
    });

    return (e: SFocusEvent<T>) => {
        if (
            e.target instanceof HTMLButtonElement ||
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement
        ) {
            stateRef.isFocused = true;

            const target = e.target;
            const onBlurHandler: EventListenerOrEventListenerObject | null = (e) => {
                stateRef.isFocused = false;

                if (target.disabled) {
                    dispatchBlur(new FocusEvent('blur', e as FocusEvent) as SFocusEvent<T>);
                }

                if (stateRef.observer) {
                    stateRef.observer.disconnect();
                    stateRef.observer = null;
                }
            };

            target.addEventListener('focusout', onBlurHandler, { once: true });

            stateRef.observer = new MutationObserver(() => {
                if (stateRef.isFocused && target.disabled) {
                    stateRef.observer?.disconnect();
                    const relatedTargetEl =
                        target === document.activeElement ? null : document.activeElement;
                    target.dispatchEvent(
                        new FocusEvent('blur', { relatedTarget: relatedTargetEl })
                    );
                    target.dispatchEvent(
                        new FocusEvent('focusout', {
                            bubbles: true,
                            relatedTarget: relatedTargetEl
                        })
                    );
                }
            });

            stateRef.observer.observe(target, {
                attributes: true,
                attributeFilter: ['disabled']
            });
        }
    };
};
