"use client";

import { useEffect, useRef } from "react";

// Scope channel colours follow bench-oscilloscope convention: CH1 yellow, CH2 cyan, CH3 magenta.
export const channelColors = ["#f3d55b", "#62d6f2", "#ec84d6"] as const;
const lanes = [0.3, 0.53, 0.77];

export default function Scope({ solo }: { solo: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soloRef = useRef<number | null>(solo);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => { soloRef.current = solo; redrawRef.current?.(); }, [solo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const samples = Array.from({ length: 48 }, (_, i) => Math.sin(i * 12.9898) * 0.6 + Math.sin(i * 4.1) * 0.35);
    const s = { w: 0, h: 0, t: 0, sweep: reduce ? 1 : 0, px: 0.6, py: 0.45, tx: 0.6, ty: 0.45, inside: false, weights: [1, 1, 1] };
    let raf = 0, last = 0, onScreen = true;

    // x runs 0..1 across the screen; each channel returns a value in roughly -1..1.
    function wave(i: number, x: number) {
      const probe = s.inside ? Math.exp(-((x - s.px) ** 2) / 0.004) : 0;
      const freq = 0.7 + s.py * 1.1;
      if (i === 0) {
        const phase = (((x * 7 * freq - s.t * 0.3) % 1) + 1) % 1;
        const duty = 0.2 + s.px * 0.6;
        return (phase < duty ? 0.8 : -0.8) * (1 + probe * 0.45);
      }
      if (i === 1) {
        const envelope = 0.5 + 0.42 * Math.sin(x * Math.PI * 3 - s.t * 0.9);
        return Math.sin(x * Math.PI * 44 * freq - s.t * 5) * envelope * (1 + probe * 0.7);
      }
      const k = Math.floor(x * 26 + s.t * 1.4);
      return samples[((k % 48) + 48) % 48] * 0.8 * (1 + probe * 0.6);
    }

    function draw() {
      if (!ctx) return;
      const { w, h } = s;
      ctx.clearRect(0, 0, w, h);
      const amp = h * 0.1;
      const end = w * s.sweep;
      for (let i = 0; i < 3; i++) {
        const target = soloRef.current === null || soloRef.current === i ? 1 : 0.12;
        s.weights[i] = reduce ? target : s.weights[i] + (target - s.weights[i]) * 0.14;
        ctx.beginPath();
        for (let x = 0; x <= end; x += 2) {
          const y = lanes[i] * h - wave(i, x / w) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = s.weights[i];
        ctx.strokeStyle = channelColors[i];
        ctx.lineWidth = soloRef.current === i ? 2.2 : 1.6;
        ctx.shadowColor = channelColors[i];
        ctx.shadowBlur = 12 * s.weights[i];
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (s.sweep < 1) {
        ctx.fillStyle = "#fff8d6";
        ctx.fillRect(end - 1, 0, 2, h);
      }
      if (s.inside && !reduce) {
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = "rgba(238,241,230,.35)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s.px * w, 0); ctx.lineTo(s.px * w, h); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function frame(now: number) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      s.t += dt;
      s.px += (s.tx - s.px) * 0.1;
      s.py += (s.ty - s.py) * 0.1;
      if (s.sweep < 1) s.sweep = Math.min(1, s.sweep + dt / 1.5);
      draw();
      raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && !reduce && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = rect.width; s.h = rect.height;
      canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const move = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      s.tx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      s.ty = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      s.inside = true;
      if (reduce) draw();
    };
    const leave = () => { s.inside = false; if (reduce) draw(); };
    const visibility = () => (document.hidden ? stop() : start());

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const viewObserver = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) start(); else stop(); });
    viewObserver.observe(canvas);
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    redrawRef.current = () => { if (reduce) draw(); };
    resize();
    start();
    return () => {
      stop(); resizeObserver.disconnect(); viewObserver.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      redrawRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="scope-canvas" aria-hidden="true" />;
}
