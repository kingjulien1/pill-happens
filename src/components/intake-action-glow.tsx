"use client";

import { APPEARANCE_CHANGE_EVENT } from "@/lib/appearance";
import { APP_SECONDARY_COLOR } from "@/lib/app-theme";

import { useEffect, type RefObject } from "react";
import {
  getIntakeGlowCanvasBounds,
  getIntakeGlowMotion,
  getIntakeGlowOpacity,
  INTAKE_GLOW_PADDING,
  INTAKE_GLOW_RADIUS,
} from "@/lib/intake-action-glow";

const HALO_FALLBACK = ["#bba4e4", "#8369a0", APP_SECONDARY_COLOR];

const readHaloPalette = (styles: CSSStyleDeclaration) => {
  const colors = HALO_FALLBACK.map((fallback, index) => {
    const value = styles
      .getPropertyValue(`--intake-rim-stop-${index + 1}`)
      .trim();
    const hex = /^#[\da-f]{6}$/i.test(value) ? value : fallback;
    return [1, 3, 5].map((offset) =>
      parseInt(hex.slice(offset, offset + 2), 16),
    );
  });
  // A bright foundation stays present around the entire perimeter. Only a
  // broad tint changes across it, so no isolated cream-colored dots can form.
  return colors.map(
    (color) =>
      `rgb(${color.map((channel, index) => Math.round(channel * 0.3 + colors[2][index] * 0.7)).join(",")})`,
  );
};

function roundedOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  ry: number,
) {
  context.beginPath();
  if (rx <= 0 || ry <= 0) {
    context.rect(x, y, width, height);
    return;
  }
  context.moveTo(x + rx, y);
  context.lineTo(x + width - rx, y);
  context.ellipse(x + width - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
  context.lineTo(x + width, y + height - ry);
  context.ellipse(x + width - rx, y + height - ry, rx, ry, 0, 0, Math.PI / 2);
  context.lineTo(x + rx, y + height);
  context.ellipse(x + rx, y + height - ry, rx, ry, 0, Math.PI / 2, Math.PI);
  context.lineTo(x, y + ry);
  context.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
  context.closePath();
}

/** A filter-free exterior light plane, below content and outside clipped ancestors. */
export function IntakeActionGlow({
  targetRef,
}: {
  targetRef: RefObject<HTMLButtonElement | null>;
}) {
  useEffect(() => {
    const button = targetRef.current;
    if (!button) return;
    const shell = button.closest<HTMLElement>(".intake-action-shell");
    const canvas = document.createElement("canvas");
    canvas.className = "intake-action-glow";
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.intakeActionGlow = "";
    canvas.dataset.glowType = "continuous-perimeter";
    canvas.dataset.rendered = "false";
    canvas.dataset.animated = "false";
    canvas.dataset.visible = "false";
    canvas.dataset.paintPadding = String(INTAKE_GLOW_PADDING);
    canvas.dataset.paintRadius = String(INTAKE_GLOW_RADIUS);
    Object.assign(canvas.style, {
      position: "fixed",
      pointerEvents: "none",
    });
    const mark = (
      name: "rendered" | "animated" | "visible",
      value: boolean,
    ) => {
      const text = String(value);
      if (canvas.dataset[name] !== text) canvas.dataset[name] = text;
      if (name === "rendered" && shell?.dataset.actionGlowRendered !== text)
        shell?.setAttribute("data-action-glow-rendered", text);
    };
    mark("rendered", false);
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d", { alpha: true });
    } catch {
      // The host retains its rounded CSS shadow if native canvas is unavailable.
    }
    if (!context) return () => mark("rendered", false);
    const ctx = context;
    const halo = document.createElement("canvas");
    let haloContext: CanvasRenderingContext2D | null = null;
    try {
      haloContext = halo.getContext("2d", { alpha: true });
    } catch {
      // A failed offscreen cache also leaves the host's CSS fallback intact.
    }
    if (!haloContext) return () => mark("rendered", false);
    // Body is already isolated. A later -1 plane sits above ambient, below copy.
    document.body.appendChild(canvas);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targetStyle = getComputedStyle(button);
    const ancestorStyles: CSSStyleDeclaration[] = [];
    for (let node: HTMLElement | null = button; node; node = node.parentElement)
      ancestorStyles.push(getComputedStyle(node));
    let raf: number | null = null;
    let time = 0;
    let last = 0;
    let intersecting = true;
    let disposed = false;
    let lost = false;
    let haloKey = "";
    let placementKey = "";

    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      last = 0;
      mark("animated", false);
    };
    const hide = () => {
      canvas.style.visibility = "hidden";
      mark("visible", false);
      mark("rendered", false);
    };
    const canAnimate = () =>
      !disposed &&
      !lost &&
      intersecting &&
      !document.hidden &&
      !motion.matches &&
      !button.disabled &&
      button.isConnected;

    const draw = () => {
      if (
        disposed ||
        lost ||
        document.hidden ||
        !intersecting ||
        !button.isConnected
      ) {
        hide();
        return false;
      }
      const box = button.getBoundingClientRect();
      const visual = window.visualViewport;
      const bounds = getIntakeGlowCanvasBounds(box, {
        left: visual?.offsetLeft ?? 0,
        top: visual?.offsetTop ?? 0,
        width: visual?.width ?? window.innerWidth,
        height: visual?.height ?? window.innerHeight,
      });
      if (
        !bounds ||
        targetStyle.visibility === "hidden" ||
        targetStyle.visibility === "collapse"
      ) {
        hide();
        return false;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bitmapWidth = Math.max(1, Math.ceil(bounds.width * ratio));
      const bitmapHeight = Math.max(1, Math.ceil(bounds.height * ratio));
      if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
      if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
      const nextPlacementKey = `${bounds.left}:${bounds.top}:${bounds.width}:${bounds.height}`;
      if (placementKey !== nextPlacementKey) {
        Object.assign(canvas.style, {
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        });
        placementKey = nextPlacementKey;
      }
      canvas.style.visibility = "visible";
      const layoutWidth = parseFloat(targetStyle.width) || button.offsetWidth;
      const layoutHeight =
        parseFloat(targetStyle.height) || button.offsetHeight;
      const radius = Math.max(
        0,
        Math.min(
          parseFloat(targetStyle.borderTopLeftRadius) || 0,
          layoutWidth / 2,
          layoutHeight / 2,
        ),
      );
      const scaleX = box.width / layoutWidth;
      const scaleY = box.height / layoutHeight;
      const rx = radius * scaleX;
      const ry = radius * scaleY;
      const haloWidth = box.width + INTAKE_GLOW_PADDING * 2;
      const haloHeight = box.height + INTAKE_GLOW_PADDING * 2;
      const nextHaloKey = `${box.width}:${box.height}:${rx}:${ry}:${ratio}`;
      let opacity = button.disabled ? 0.35 : 1;
      for (const styles of ancestorStyles) opacity *= Number(styles.opacity);
      try {
        if (haloKey !== nextHaloKey) {
          halo.width = Math.max(1, Math.ceil(haloWidth * ratio));
          halo.height = Math.max(1, Math.ceil(haloHeight * ratio));
          haloContext.setTransform(
            halo.width / haloWidth,
            0,
            0,
            halo.height / haloHeight,
            0,
            0,
          );
          haloContext.globalCompositeOperation = "lighter";
          roundedOutline(
            haloContext,
            INTAKE_GLOW_PADDING,
            INTAKE_GLOW_PADDING,
            box.width,
            box.height,
            rx,
            ry,
          );
          // Native concentric strokes approximate a smooth finite halo once per size.
          for (
            let distance = INTAKE_GLOW_RADIUS;
            distance >= 1;
            distance -= 1
          ) {
            const outer = getIntakeGlowOpacity(distance);
            const inner = getIntakeGlowOpacity(distance - 1);
            haloContext.strokeStyle = `rgba(255,255,255,${inner - outer})`;
            haloContext.lineWidth = distance * 2;
            haloContext.stroke();
          }
          haloKey = nextHaloKey;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(
          canvas.width / bounds.width,
          0,
          0,
          canvas.height / bounds.height,
          0,
          0,
        );
        ctx.globalCompositeOperation = "source-over";
        const field = getIntakeGlowMotion(time);
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity * field.opacity));
        const x = box.left - bounds.left;
        const y = box.top - bounds.top;
        ctx.drawImage(
          halo,
          x - INTAKE_GLOW_PADDING,
          y - INTAKE_GLOW_PADDING,
          haloWidth,
          haloHeight,
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-in";
        const centerX = x + box.width / 2;
        const centerY = y + box.height / 2;
        const colors = readHaloPalette(targetStyle);
        if (typeof ctx.createConicGradient === "function") {
          const gradient = ctx.createConicGradient(
            field.angle,
            centerX,
            centerY,
          );
          colors.forEach((color, index) =>
            gradient.addColorStop(index / 3, color),
          );
          gradient.addColorStop(1, colors[0]);
          ctx.fillStyle = gradient;
        } else ctx.fillStyle = colors[1];
        ctx.fillRect(0, 0, bounds.width, bounds.height);
        // Only exterior light is composited; the label and button face stay clear.
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out";
        roundedOutline(ctx, x, y, box.width, box.height, rx, ry);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        mark("visible", opacity > 0);
        mark("rendered", true);
        return true;
      } catch {
        hide();
        return false;
      }
    };
    const frame = (now: number) => {
      raf = null;
      if (!canAnimate()) {
        stop();
        return;
      }
      time += last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (draw() && canAnimate()) {
        mark("animated", true);
        raf = requestAnimationFrame(frame);
      } else stop();
    };
    const sync = () => {
      stop();
      if (draw() && canAnimate()) {
        mark("animated", true);
        raf = requestAnimationFrame(frame);
      }
    };
    const onGeometry = () => {
      if (raf !== null || disposed || document.hidden || !intersecting) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        sync();
      });
    };
    const onContextLost = () => {
      lost = true;
      stop();
      hide();
    };
    const onContextRestored = () => {
      lost = false;
      haloKey = "";
      sync();
    };
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(onGeometry);
    resize?.observe(button);
    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              intersecting = entries.some((entry) => entry.isIntersecting);
              sync();
            },
            { rootMargin: `${INTAKE_GLOW_RADIUS}px` },
          );
    intersection?.observe(button);
    const disabled = new MutationObserver(sync);
    disabled.observe(button, {
      attributes: true,
      attributeFilter: ["disabled", "hidden", "style", "class"],
    });
    for (let node = button.parentElement; node; node = node.parentElement)
      disabled.observe(node, {
        attributes: true,
        attributeFilter: ["hidden", "style", "class"],
      });
    canvas.addEventListener("contextlost", onContextLost);
    canvas.addEventListener("contextrestored", onContextRestored);
    motion.addEventListener("change", sync);
    window.addEventListener(APPEARANCE_CHANGE_EVENT, sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("scroll", onGeometry, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", onGeometry, { passive: true });
    window.visualViewport?.addEventListener("resize", onGeometry, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", onGeometry, {
      passive: true,
    });
    sync();
    return () => {
      disposed = true;
      stop();
      resize?.disconnect();
      intersection?.disconnect();
      disabled.disconnect();
      canvas.removeEventListener("contextlost", onContextLost);
      canvas.removeEventListener("contextrestored", onContextRestored);
      motion.removeEventListener("change", sync);
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, sync);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("scroll", onGeometry, true);
      window.removeEventListener("resize", onGeometry);
      window.visualViewport?.removeEventListener("resize", onGeometry);
      window.visualViewport?.removeEventListener("scroll", onGeometry);
      mark("rendered", false);
      canvas.remove();
    };
  }, [targetRef]);
  return null;
}
