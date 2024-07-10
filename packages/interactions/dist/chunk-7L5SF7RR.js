// src/useHover.svelte.ts
var globalIgnoreEmulatedMouseEvents = false;
var hoverCount = 0;
var setGlobalIgnoreEmulatedMouseEvents = () => {
  globalIgnoreEmulatedMouseEvents = true;
  setTimeout(() => {
    globalIgnoreEmulatedMouseEvents = false;
  }, 50);
};
var handleGlobalPointerEvent = (e) => {
  if (e.pointerType === "touch") {
    setGlobalIgnoreEmulatedMouseEvents();
  }
};
var setupGlobalTouchEvents = () => {
  if (typeof document === "undefined") return;
  if (typeof PointerEvent !== "undefined") {
    document.addEventListener("pointerup", handleGlobalPointerEvent);
  } else {
    document.addEventListener("touchend", setGlobalIgnoreEmulatedMouseEvents);
  }
  hoverCount++;
  return () => {
    hoverCount--;
    if (hoverCount > 0) return;
    if (typeof PointerEvent !== "undefined") {
      document.removeEventListener("pointerup", handleGlobalPointerEvent);
    } else {
      document.removeEventListener("touchend", setGlobalIgnoreEmulatedMouseEvents);
    }
  };
};
var useHover = (props = {}) => {
  const { onHoverStart, onHoverEnd, onHoverChange, isDisabled } = props;
  let isHovered = $state(false);
  const state = $state({
    isHovered: false,
    ignoreEmulatedMouseEvents: false,
    pointerType: "",
    target: null
  });
  $effect(setupGlobalTouchEvents);
  const { hoverProps, triggerHoverEnd } = $derived.by(() => {
    const triggerHoverStart = (event, pointerType) => {
      state.pointerType = pointerType;
      if (
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        isDisabled || pointerType === "touch" || state.isHovered || !event.currentTarget.contains(event.target)
      ) {
        return;
      }
      state.isHovered = true;
      const target = event.currentTarget;
      state.target = target;
      if (onHoverStart) {
        onHoverStart({
          type: "hoverstart",
          target,
          pointerType
        });
      }
      if (onHoverChange) {
        onHoverChange(true);
      }
      isHovered = true;
    };
    const triggerHoverEnd2 = (event, pointerType) => {
      state.pointerType = "";
      state.target = null;
      if (pointerType === "touch" || !state.isHovered) return;
      state.isHovered = false;
      const target = event.currentTarget;
      if (onHoverEnd) {
        onHoverEnd({
          type: "hoverend",
          target,
          pointerType
        });
      }
      if (onHoverChange) {
        onHoverChange(false);
      }
      isHovered = false;
    };
    const hoverProps2 = {};
    if (typeof PointerEvent !== "undefined") {
      hoverProps2.onpointerenter = (e) => {
        if (globalIgnoreEmulatedMouseEvents && e.pointerType === "mouse") {
          return;
        }
        triggerHoverStart(e, e.pointerType);
      };
      hoverProps2.onpointerleave = (e) => {
        if (!isDisabled && e.currentTarget.contains(e.target)) {
          triggerHoverEnd2(e, e.pointerType);
        }
      };
    } else {
      hoverProps2.ontouchstart = () => {
        state.ignoreEmulatedMouseEvents = true;
      };
      hoverProps2.onmouseenter = (e) => {
        if (!state.ignoreEmulatedMouseEvents && !globalIgnoreEmulatedMouseEvents) {
          triggerHoverStart(e, "mouse");
        }
        state.ignoreEmulatedMouseEvents = false;
      };
      hoverProps2.onmouseleave = (e) => {
        if (!isDisabled && e.currentTarget.contains(e.target)) {
          triggerHoverEnd2(e, "mouse");
        }
      };
    }
    return {
      hoverProps: hoverProps2,
      triggerHoverEnd: triggerHoverEnd2
    };
  });
  $effect(() => {
    if (isDisabled) {
      triggerHoverEnd({ currentTarget: state.target }, state.pointerType);
    }
  });
  return {
    isHovered: () => isHovered,
    hoverProps: () => hoverProps
  };
};

export {
  useHover
};
