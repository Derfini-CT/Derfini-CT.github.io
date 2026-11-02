"use client";

import { useEffect, useRef } from "react";
import "./probe-cursor.css";

// Restore the original glowing probe, eased ring and fading trail.
export default function ProbeCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dot = dotRef.current, ring = ringRef.current, trail = trailRef.current;
    const ctx = trail?.getContext("2d");
    if (!dot || !ring || !trail || !ctx) return;
    const root = document.documentElement;
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
    const points: { x: number; y: number; t: number }[] = [];
    let mx = -100, my = -100, rx = -100, ry = -100, raf = 0, seen = false;
    let width = innerWidth, height = innerHeight;

    const hide = () => {
      cancelAnimationFrame(raf); raf = 0; seen = false; points.length = 0;
      root.classList.remove("probe-seen"); ring.classList.remove("is-down");
      ctx.clearRect(0, 0, width, height);
    };
    const resize = () => {
      hide(); width = innerWidth; height = innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      trail.width = Math.round(width * dpr); trail.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const frame = () => {
      raf = 0;
      if (!seen) return;
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      root.classList.add("probe-seen");
      const now = performance.now();
      while (points.length && now - points[0].t > 420) points.shift();
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 10;
      for (let i = 1; i < points.length; i++) {
        const life = 1 - (now - points[i].t) / 420;
        ctx.strokeStyle = `rgba(96,165,250,${(life * 0.75).toFixed(3)})`;
        ctx.lineWidth = 0.5 + life * 2.2;
        ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
      }
      // Let the original trail fade and ring settle, then stop until the next move.
      if (points.length || Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) raf = requestAnimationFrame(frame);
    };
    const move = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!media.matches || event.pointerType !== "mouse" || !target?.closest(".pcb, .pcb-project-dialog, .pcb-sheet") || target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), iframe")) { hide(); return; }
      mx = event.clientX; my = event.clientY;
      if (!seen) { seen = true; rx = mx; ry = my; }
      points.push({ x: mx, y: my, t: performance.now() });
      if (points.length > 96) points.shift();
      const interactive = target.closest("a[href], button, [role='button'], [role='link'], summary, label");
      ring.dataset.mode = interactive && !target.closest(":disabled, [aria-disabled='true'], [inert]") ? "link" : "";
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const down = (event: PointerEvent) => { if (event.pointerType === "mouse" && seen) ring.classList.add("is-down"); else hide(); };
    const up = () => ring.classList.remove("is-down");
    const out = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    const visibility = () => { if (document.hidden) hide(); };
    const capabilities = () => { hide(); root.classList.toggle("probe-on", media.matches); };

    resize(); capabilities();
    document.addEventListener("pointermove", move, { passive: true, capture: true });
    document.addEventListener("pointerdown", down, { passive: true, capture: true });
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointerout", out, { passive: true, capture: true });
    document.addEventListener("pointercancel", hide, true);
    document.addEventListener("keydown", hide, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", resize);
    window.addEventListener("blur", hide);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    media.addEventListener("change", capabilities);
    return () => {
      hide(); root.classList.remove("probe-on", "probe-seen");
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("pointercancel", hide, true);
      document.removeEventListener("keydown", hide, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", hide);
      window.removeEventListener("scroll", hide, true);
      media.removeEventListener("change", capabilities);
    };
  }, []);

  return <><canvas ref={trailRef} className="probe-trail" aria-hidden="true" /><div ref={ringRef} className="probe-ring" aria-hidden="true" /><div ref={dotRef} className="probe-dot" aria-hidden="true" /></>;
}
