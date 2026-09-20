"use client";
import { useEffect, useRef, useState } from "react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/**
 * One-shot scroll reveals. Children opt in with `data-reveal` (+ optional
 * `t-d1..t-d6` stagger delay). Elements stay visible without JS (the `.js`
 * gate lives in CSS), and pop in immediately under reduced motion.
 */
export function useRevealRoot() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    document.documentElement.classList.add("js");
    const root = ref.current ?? document;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    if (!els.length) return;
    if (prefersReducedMotion()) {
      els.forEach((e) => e.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Animated number that eases toward `target`. Jumps instantly under reduced motion. */
export function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    if (prefersReducedMotion()) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
