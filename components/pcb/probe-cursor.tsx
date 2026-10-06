"use client";

import { useEffect, useRef } from "react";

// A probe-tip cursor with a fading copper trail. Mouse and trackpad only; touch and
// reduced-motion users keep the system cursor and never mount the animation loop.
export default function ProbeCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dot = dotRef.current, ring = ringRef.current, trail = trailRef.current;
    const ctx = trail?.getContext("2d");
    if (!dot || !ring || !trail || !ctx) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    root.classList.add("probe-on");
    const points: { x: number; y: number; t: number }[] = [];
    let mx = -100, my = -100, rx = -100, ry = -100, raf = 0, seen = false;
    let magnet: HTMLElement | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      trail.width = Math.round(innerWidth * dpr); trail.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const releaseMagnet = () => { if (magnet) { magnet.style.translate = ""; magnet = null; } };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      mx = event.clientX; my = event.clientY;
      if (!seen) { seen = true; rx = mx; ry = my; root.classList.add("probe-seen"); }
      points.push({ x: mx, y: my, t: performance.now() });
      const target = event.target instanceof Element ? event.target : null;
      const field = target?.closest("input, textarea, select");
      const interactive = target?.closest("a, button, [role='button'], label");
      ring.dataset.mode = field ? "text" : interactive ? "link" : "";
      dot.dataset.mode = ring.dataset.mode;

      const next = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (next !== magnet) releaseMagnet();
      if (next) {
        magnet = next;
        const rect = next.getBoundingClientRect();
        const dx = mx - (rect.left + rect.width / 2), dy = my - (rect.top + rect.height / 2);
        next.style.translate = `${dx * 0.22}px ${dy * 0.3}px`;
      }
    };
    const down = () => ring.classList.add("is-down");
    const up = () => ring.classList.remove("is-down");
    const out = (event: MouseEvent) => { if (!event.relatedTarget) { root.classList.remove("probe-seen"); seen = false; releaseMagnet(); } };

    const frame = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;

      const now = performance.now();
      while (points.length && now - points[0].t > 420) points.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (points.length > 1) {
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.shadowColor = "#e8a868"; ctx.shadowBlur = 10;
        for (let i = 1; i < points.length; i++) {
          const life = 1 - (now - points[i].t) / 420;
          ctx.strokeStyle = `rgba(232,168,104,${(life * 0.75).toFixed(3)})`;
          ctx.lineWidth = 0.5 + life * 2.2;
          ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("mouseout", out);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf); releaseMagnet();
      root.classList.remove("probe-on", "probe-seen");
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseout", out);
    };
  }, []);

  return <>
    <canvas ref={trailRef} className="probe-trail" aria-hidden="true" />
    <div ref={ringRef} className="probe-ring" aria-hidden="true" />
    <div ref={dotRef} className="probe-dot" aria-hidden="true" />
  </>;
}
