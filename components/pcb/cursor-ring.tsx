"use client";

import { useEffect, useRef } from "react";
import "./cursor-ring.css";

const publicSurface = ".pcb, .pcb-project-dialog, .pcb-sheet";
const editingSurface = "input, textarea, select, [contenteditable]:not([contenteditable='false']), iframe";
const interactiveSurface = "a[href], button, [role='button'], [role='link'], summary";

export default function CursorRing() {
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
    let frame = 0;
    let x = 0;
    let y = 0;
    let interactive = false;

    function hide() {
      cancelAnimationFrame(frame); frame = 0;
      ring!.classList.remove("is-visible", "is-interactive");
    }
    function move(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!media.matches || event.pointerType !== "mouse" || event.buttons !== 0 || !target?.closest(publicSurface) || target.closest(editingSurface) || target.closest(":disabled, [aria-disabled='true'], [inert]")) {
        hide(); return;
      }
      x = event.clientX; y = event.clientY;
      interactive = Boolean(target.closest(interactiveSurface));
      // Coalesce movement into a single paint. There is no idle animation loop.
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        ring!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        ring!.classList.toggle("is-interactive", interactive);
        ring!.classList.add("is-visible");
      });
    }
    function leave(event: PointerEvent) { if (!event.relatedTarget) hide(); }
    function down(event: PointerEvent) { if (event.pointerType !== "mouse") hide(); }
    function visibility() { if (document.hidden) hide(); }

    document.addEventListener("pointermove", move, { passive: true, capture: true });
    document.addEventListener("pointerout", leave, { passive: true, capture: true });
    document.addEventListener("pointerdown", down, { passive: true, capture: true });
    document.addEventListener("pointercancel", hide, true);
    document.addEventListener("keydown", hide, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    media.addEventListener("change", hide);
    return () => {
      hide();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerout", leave, true);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointercancel", hide, true);
      document.removeEventListener("keydown", hide, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
      media.removeEventListener("change", hide);
    };
  }, []);

  return <span ref={ringRef} className="portfolio-cursor-ring" aria-hidden="true"><span /></span>;
}
