"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ScrollRevealProps = {
  children: ReactNode;
  /** Tweak how early the element starts revealing as it approaches the viewport. */
  rootMargin?: string;
  /** Stagger delay in ms — useful when revealing a list. */
  delay?: number;
  className?: string;
};

// Wraps content in a div that slides up + fades in the first time it enters
// the viewport. Once revealed, it stays revealed.
//
// On the server (and during hydration before the IntersectionObserver fires)
// the content renders already-visible. The animation only plays for users
// whose device supports IntersectionObserver — every other user just gets
// the content immediately, which is the right fallback.
export default function ScrollReveal({
  children,
  rootMargin = "0px 0px -10% 0px",
  delay = 0,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      className={
        "scroll-reveal " +
        (revealed ? "scroll-reveal--in " : "") +
        (className ?? "")
      }
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
