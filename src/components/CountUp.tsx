"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up when it changes.
 *
 * The animation is decoration and must never be the source of truth. Browsers
 * suspend requestAnimationFrame in background tabs, so a value driven purely by
 * the animation can be left showing a stale figure — which on a scoreboard is a
 * wrong number, not just a missing flourish. So: snap immediately when we can't
 * animate, and back every run with a timer that lands on the real value
 * regardless of whether a single frame was painted.
 */
export function CountUp({ value, duration = 750 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || document.hidden) {
      setShown(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);          // ease-out cubic
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Guarantees the final value even if no frame is ever painted.
    const settle = setTimeout(() => setShown(value), duration + 120);

    return () => { cancelAnimationFrame(frame); clearTimeout(settle); };
  }, [value, duration]);

  return <>{shown.toLocaleString()}</>;
}
