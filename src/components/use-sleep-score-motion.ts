"use client";

import { useEffect, useRef } from "react";
import {
  advanceSleepPill,
  createSleepPill,
  sleepPillAppearance,
  SLEEP_PILL_LIMIT,
  type SleepPill,
} from "@/lib/sleep-score-particles";
import styles from "./sleep-score-ring.module.css";

const COLORS = [
  ["#a855f7", "#6d28d9", "#e9d5ff"],
  ["#ec4899", "#be185d", "#fbcfe8"],
  ["#d946ef", "#9333ea", "#f5d0fe"],
] as const;
type Impact = {
  x: number;
  y: number;
  age: number;
  color: string;
  pop: boolean;
};

/** One bounded 2D layer; no React frame updates or work outside the visible dial. */
export function useSleepScoreMotion(enabled: boolean) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dial = anchor.current;
    if (!dial || !enabled) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const viewport = window.visualViewport;
    let visible = typeof IntersectionObserver !== "function";
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let frame = 0;
    let last = 0;
    let next = 0;
    let width = 0;
    let height = 0;
    let left = 0;
    let top = 0;
    let count = -1;
    let pills: SleepPill[] = [];
    let impacts: Impact[] = [];

    const resize = () => {
      if (!canvas || !ctx) return;
      width = viewport?.width ?? window.innerWidth;
      height = viewport?.height ?? window.innerHeight;
      left = viewport?.offsetLeft ?? 0;
      top = viewport?.offsetTop ?? 0;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      Object.assign(canvas.style, {
        width: `${width}px`,
        height: `${height}px`,
        left: `${left}px`,
        top: `${top}px`,
      });
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      pills = [];
      impacts = [];
      count = -1;
      canvas?.remove();
      canvas = null;
      ctx = null;
      dial.dataset.active = "false";
    };
    const impact = (pill: SleepPill, pop: boolean) => {
      if (impacts.length >= 10) impacts.shift();
      impacts.push({
        x: pill.x,
        y: pill.y,
        age: 0,
        color: COLORS[pill.color][2],
        pop,
      });
    };
    const drawPill = (pill: SleepPill) => {
      if (!ctx) return;
      const look = sleepPillAppearance(pill);
      if (look.opacity <= 0) return;
      const [first, second, ink] = COLORS[pill.color];
      ctx.save();
      ctx.translate(pill.x, pill.y);
      ctx.rotate(pill.rotation);
      ctx.scale((look.scale * pill.size) / 20, (look.scale * pill.size) / 20);
      ctx.globalAlpha = look.opacity;
      // Capsule with two saturated halves and the familiar divider.
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, -5);
      ctx.bezierCurveTo(11.7, -5, 11.7, 5, 5, 5);
      ctx.lineTo(-5, 5);
      ctx.bezierCurveTo(-11.7, 5, -11.7, -5, -5, -5);
      ctx.closePath();
      ctx.fillStyle = first;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = second;
      ctx.fillRect(0, -6, 12, 12);
      ctx.restore();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(0, 4.5);
      ctx.stroke();
      ctx.restore();
    };
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 32 || !ctx || !canvas) return;
      const elapsed = last ? now - last : 33;
      last = now;
      ctx.clearRect(0, 0, width, height);
      if (now >= next && pills.length < SLEEP_PILL_LIMIT) {
        const rect = dial.getBoundingClientRect();
        const score = Number(dial.dataset.score || 0);
        const angle =
          ((135 + (Math.random() * 270 * score) / 100) * Math.PI) / 180;
        const radius = (rect.width * 91) / 240;
        pills.push(
          createSleepPill({
            x: rect.left - left + rect.width / 2 + Math.cos(angle) * radius,
            y: rect.top - top + rect.height / 2 + Math.sin(angle) * radius,
            angle,
          }),
        );
        next = now + 700 + Math.random() * 300;
      }
      pills = pills.filter((pill) => {
        const result = advanceSleepPill(pill, elapsed, { width, height });
        if (result.hit || result.expired) impact(pill, result.expired);
        if (!result.expired) drawPill(pill);
        return !result.expired;
      });
      impacts = impacts.filter((hit) => {
        hit.age += elapsed;
        const progress = hit.age / (hit.pop ? 240 : 200);
        if (progress >= 1) return false;
        ctx!.save();
        ctx!.translate(hit.x, hit.y);
        ctx!.strokeStyle = hit.color;
        ctx!.lineWidth = 1.1 * (1 - progress);
        ctx!.globalAlpha = (1 - progress) * 0.8;
        ctx!.beginPath();
        ctx!.arc(0, 0, 2 + progress * (hit.pop ? 11 : 7), 0, Math.PI * 2);
        ctx!.stroke();
        for (let ray = 0; ray < 4; ray++) {
          ctx!.rotate(Math.PI / 2);
          ctx!.beginPath();
          ctx!.moveTo(4 + progress * 8, 0);
          ctx!.lineTo(6 + progress * 10, 0);
          ctx!.stroke();
        }
        ctx!.restore();
        return true;
      });
      if (count !== pills.length) {
        count = pills.length;
        canvas.dataset.particles = String(count);
      }
    };
    const sync = () => {
      if (
        !visible ||
        document.hidden ||
        motion.matches ||
        dial.closest('[inert], [aria-hidden="true"], [data-closed]')
      ) {
        stop();
        return;
      }
      if (frame) return;
      canvas = document.createElement("canvas");
      canvas.className = styles.particles;
      canvas.setAttribute("aria-hidden", "true");
      canvas.dataset.sleepScoreParticles = "";
      ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) {
        canvas = null;
        return;
      }
      document.body.append(canvas);
      resize();
      dial.dataset.active = "true";
      next = performance.now() + 200;
      frame = requestAnimationFrame(draw);
    };
    const intersection =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting && entry.intersectionRatio > 0.15;
              sync();
            },
            { threshold: [0, 0.15] },
          )
        : null;
    intersection?.observe(dial);
    const visibility = new MutationObserver(sync);
    for (
      let element = dial.parentElement;
      element;
      element = element.parentElement
    ) {
      visibility.observe(element, {
        attributes: true,
        attributeFilter: ["inert", "aria-hidden", "data-closed"],
      });
    }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    window.addEventListener("resize", resize);
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    if (!intersection) sync();
    return () => {
      stop();
      intersection?.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      window.removeEventListener("resize", resize);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
    };
  }, [enabled]);
  return anchor;
}
