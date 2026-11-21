"use client";

import { useLayoutEffect, useRef } from "react";

/** Only the label notch needs measuring; the wash fades belong to CSS. */
export function useIntakeGroupSurface(enabled: boolean) {
  const groupRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    const label = labelRef.current;
    if (!enabled || !group || !label) return;
    const measure = () => {
      const width = `${label.offsetWidth}px`;
      if (group.style.getPropertyValue("--intake-group-toggle-width") !== width)
        group.style.setProperty("--intake-group-toggle-width", width);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(label);
    return () => resize.disconnect();
  }, [enabled]);

  return { groupRef, labelRef };
}
