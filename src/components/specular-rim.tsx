"use client";

import { APPEARANCE_CHANGE_EVENT } from "@/lib/appearance";

// Adapted from React Bits SpecularButton by David Haz (2026).
// MIT + Commons Clause; see /licenses/react-bits.txt.
// https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/SpecularButton
import { useEffect, useRef, type CSSProperties } from "react";
import { APP_COLORS } from "@/lib/app-theme";
import { readRimColor } from "@/lib/specular-rim-color";
import { mapRimToCanvas } from "@/lib/specular-rim-geometry";
import { cn } from "@/lib/utils";

const PAD = 64;
const TAU = Math.PI * 2;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform vec2 uScale;
uniform vec2 uPixelRatio;
uniform vec2 uScreenHalf;
uniform vec2 uScreenRadius;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec4 uLineColor;
uniform vec4 uBaseColor;
uniform vec4 uGlowColor;
uniform float uSpectrum;
uniform vec4 uStop1;
uniform vec4 uStop2;
uniform vec4 uStop3;
uniform vec4 uStop4;
uniform vec4 uStop5;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// A scaled CSS round corner is an ellipse. Solve its nearest boundary point
// rather than allowing nonuniform transforms to stretch the border thickness.
float ellipseDistance(vec2 p, vec2 r) {
  if (abs(r.x - r.y) < 0.0001) return length(p) - r.x;
  // The inscribed circle is already safely inside the inner edge here. This
  // also avoids an ill-conditioned nearest-point solve at the ellipse center.
  float innerCircle = length(p) - min(r.x, r.y);
  if (innerCircle < -uThickness - 1.0) return innerCircle;
  vec2 squared = r * r;
  bool inside = dot(p / r, p / r) < 1.0;
  float low = inside ? -min(squared.x, squared.y) + 0.00001 : 0.0;
  float high = inside ? 0.0 : max(length(p) * max(r.x, r.y), 1.0);
  for (int i = 0; i < 18; i++) {
    float midpoint = (low + high) * 0.5;
    vec2 normalized = r * p / (vec2(midpoint) + squared);
    if (dot(normalized, normalized) > 1.0) low = midpoint;
    else high = midpoint;
  }
  vec2 nearest = squared * p / (vec2((low + high) * 0.5) + squared);
  return length(nearest - p) * (inside ? -1.0 : 1.0);
}

float screenRoundedBox(vec2 p, vec2 b, vec2 r) {
  if (min(r.x, r.y) < 0.001) return roundedBox(p, b, 0.0);
  vec2 q = abs(p) - b + r;
  if (q.x > 0.0 && q.y > 0.0) return ellipseDistance(q, r);
  return max(abs(p).x - b.x, abs(p).y - b.y);
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

vec4 paint(vec4 color, float coverage) {
  float opacity = clamp(coverage * color.a, 0.0, 1.0);
  return vec4(color.rgb * opacity, opacity);
}

vec4 over(vec4 front, vec4 back) {
  return front + back * (1.0 - front.a);
}

// Like CSS gradients, interpolate translucent stops in premultiplied space.
// Keep the opaque branch identical to the original RGB interpolation.
vec4 mixColor(vec4 first, vec4 second, float amount) {
  if (first.a == 1.0 && second.a == 1.0) {
    return vec4(mix(first.rgb, second.rgb, amount), 1.0);
  }
  float alpha = mix(first.a, second.a, amount);
  vec3 premultiplied = mix(first.rgb * first.a, second.rgb * second.a, amount);
  return vec4(premultiplied / max(alpha, 0.000001), alpha);
}

vec4 spectrum(float position) {
  if (uSpectrum > 1.5) {
    float phase = fract(position) * 3.0;
    if (phase < 1.0) return mixColor(uStop1, uStop2, phase);
    if (phase < 2.0) return mixColor(uStop2, uStop3, phase - 1.0);
    return mixColor(uStop3, uStop1, phase - 2.0);
  }
  float phase = fract(position) * 5.0;
  if (phase < 1.0) return mixColor(uStop1, uStop2, phase);
  if (phase < 2.0) return mixColor(uStop2, uStop3, phase - 1.0);
  if (phase < 3.0) return mixColor(uStop3, uStop4, phase - 2.0);
  if (phase < 4.0) return mixColor(uStop4, uStop5, phase - 3.0);
  return mixColor(uStop5, uStop1, phase - 4.0);
}

void main() {
  // Work in the host's local CSS coordinates, independent of dialog transforms.
  vec2 p = (gl_FragCoord.xy - uCenter) / uScale;
  vec2 screenPoint = (gl_FragCoord.xy - uCenter) / uPixelRatio;
  float d = screenRoundedBox(screenPoint, uScreenHalf, uScreenRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  // Opposing warm and dark colors travel together around the rounded rim.
  float streak = key + back * 0.72;
  float leading = key / max(streak, 0.0001);
  vec4 lineColor = mixColor(uBaseColor, uLineColor, leading);
  vec4 glowColor = mixColor(uBaseColor, uGlowColor, leading);
  if (uSpectrum > 0.5) {
    lineColor = spectrum(position - uSpot);
    glowColor = lineColor;
  }
  float aa = 0.5 * length(vec2(dFdx(d), dFdy(d)));
  float width = uThickness;
  float band = smoothstep(-width - aa, -width + aa, d) * (1.0 - smoothstep(-aa, aa, d));
  float outside = smoothstep(-0.25 * uPx, 0.25 * uPx, d);
  float glow = (0.12 + streak * 0.04) * exp(-abs(d) / (5.0 * uPx)) * outside;
  // Keep the expanded bitmap's outer gutter completely transparent.
  glow *= 1.0 - smoothstep(48.0 * uPx, 64.0 * uPx, d);
  vec4 result = paint(glowColor, glow * uGlow);
  // Color and luminance move; the full-width physical band does not.
  float illumination = clamp((0.18 + streak * 0.82) * uIntensity, 0.0, 1.0);
  // Illumination changes RGB only: a translucent stop must not gain an opaque
  // backing from the base color. Apply its alpha once to the physical band.
  vec4 rimColor = vec4(mix(uBaseColor.rgb, lineColor.rgb, illumination), lineColor.a);
  result = over(paint(rimColor, band), result);
  outColor = result;
}`;

const UNIFORMS = [
  "uCenter",
  "uHalf",
  "uScale",
  "uPixelRatio",
  "uScreenHalf",
  "uScreenRadius",
  "uRadius",
  "uPx",
  "uSpot",
  "uLineColor",
  "uBaseColor",
  "uGlowColor",
  "uSpectrum",
  "uStop1",
  "uStop2",
  "uStop3",
  "uStop4",
  "uStop5",
  "uIntensity",
  "uWindow",
  "uThickness",
  "uGlow",
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const wrap = (value: number) => value - Math.floor(value);

const loopPosition = (
  x: number,
  y: number,
  halfX: number,
  halfY: number,
  r: number,
) => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const qx = ax - innerX;
  const qy = ay - innerY;
  let s;
  if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
  else if (qx > qy) s = Math.min(ay, innerY);
  else s = innerY + arc + innerX - Math.min(ax, innerX);
  if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
  else if (y < 0) s = 4 * quarter - s;
  return wrap(s / Math.max(4 * quarter, 0.0001));
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

const SETTINGS = {
  intensity: 1.5,
  idleIntensity: 0.35,
  shineSize: 39,
  shineFade: 61,
  thickness: 3,
  glow: 2.4,
  speed: 1.15,
};

/** Pointer-independent React Bits rim, leaving the host button's styles intact. */
export function SpecularRim({
  radius = 22,
  palette: paletteStyle = "two-tone",
  glow = true,
  className,
}: {
  radius?: number;
  palette?: "two-tone" | "spectrum" | "triad";
  /** A separate renderer may own the exterior halo while this keeps the rim. */
  glow?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.closest("button");
    if (!canvas || !button) return;
    const effects =
      button.closest<HTMLElement>(".intake-action-shell") ?? button;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intersecting = true;
    const sync = () => {
      const active =
        intersecting && !document.hidden && !motion.matches && !button.disabled;
      canvas.dataset.fallbackActive = String(active);
      effects.style.setProperty(
        "--intake-effects-play-state",
        active ? "running" : "paused",
      );
    };
    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            intersecting = entries.some((entry) => entry.isIntersecting);
            sync();
          });
    intersection?.observe(button);
    const disabled = new MutationObserver(sync);
    disabled.observe(button, {
      attributes: true,
      attributeFilter: ["disabled"],
    });
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      intersection?.disconnect();
      disabled.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      canvas.dataset.fallbackActive = "false";
      effects.style.removeProperty("--intake-effects-play-state");
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = canvas?.closest("button");
    if (!canvas || !button) return;

    canvas.dataset.rendered = "false";
    canvas.dataset.animated = "false";
    let context: WebGL2RenderingContext | null = null;
    try {
      context = canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
      });
    } catch {
      // The adjacent CSS rim remains visible if WebGL is unavailable.
    }
    if (!context) return;
    const gl = context;
    const safeRadius = Number.isFinite(radius) ? Math.max(0, radius) : 22;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readColor = (
      styles: CSSStyleDeclaration,
      property: string,
      fallback: string,
    ) => {
      return readRimColor(styles.getPropertyValue(property), fallback);
    };
    const readPalette = () => {
      const styles = getComputedStyle(button);
      return {
        line: readColor(styles, "--intake-rim-line", APP_COLORS.rust),
        base: readColor(styles, "--intake-rim-base", APP_COLORS.ink),
        glow: readColor(styles, "--intake-rim-glow", "#ffe8cf"),
        stops: [1, 2, 3, 4, 5].map((stop) =>
          readColor(styles, `--intake-rim-stop-${stop}`, APP_COLORS.rust),
        ),
      };
    };
    let palette = readPalette();
    const view = {
      width: 1,
      height: 1,
      paintWidth: 1,
      paintHeight: 1,
      ratio: 1,
    };
    let geometry: ReturnType<typeof mapRimToCanvas> = null;
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let vao: WebGLVertexArrayObject | null = null;
    let raf: number | null = null;
    let last = 0;
    let spot: number | null = null;
    let intersecting = true;
    let disposed = false;
    let lost = false;

    const mark = (name: "rendered" | "animated", value: boolean) => {
      const next = String(value);
      if (canvas.dataset[name] !== next) canvas.dataset[name] = next;
    };
    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      last = 0;
      mark("animated", false);
    };
    const release = () => {
      if (!gl.isContextLost()) {
        gl.useProgram(null);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        if (buffer) gl.deleteBuffer(buffer);
        if (vao) gl.deleteVertexArray(vao);
        if (program) gl.deleteProgram(program);
      }
      buffer = null;
      vao = null;
      program = null;
      // Do not lose the reused context: StrictMode immediately replays effects.
    };
    const initialize = () => {
      release();
      try {
        program = link(gl);
        buffer = gl.createBuffer();
        vao = gl.createVertexArray();
        if (!program || !buffer || !vao) {
          release();
          return false;
        }
        for (const name of UNIFORMS)
          uniforms[name] = gl.getUniformLocation(program, name);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        );
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        return true;
      } catch {
        release();
        return false;
      }
    };
    const cornerRadius = () =>
      clamp(safeRadius, 0, Math.min(view.width, view.height) / 2);
    const restSpot = () => {
      const r = cornerRadius();
      const inset = r * (1 - Math.SQRT1_2);
      return loopPosition(
        inset - view.width / 2,
        view.height / 2 - inset,
        view.width / 2,
        view.height / 2,
        r,
      );
    };
    const available = () =>
      !disposed && !lost && program !== null && !gl.isContextLost();
    const canAnimate = () =>
      available() &&
      intersecting &&
      !document.hidden &&
      !motion.matches &&
      !button.disabled;
    const draw = () => {
      if (!available() || !program || !vao || spot === null || !geometry) {
        mark("rendered", false);
        return false;
      }
      try {
        // CSS transforms do not resize layout boxes. Refresh screen geometry
        // during the animation so its visible band remains exactly 3 CSS px.
        geometry = mapRimToCanvas({
          button: button.getBoundingClientRect(),
          canvas: canvas.getBoundingClientRect(),
          buttonWidth: view.width,
          buttonHeight: view.height,
          bitmapWidth: canvas.width,
          bitmapHeight: canvas.height,
          radius: safeRadius,
        });
        if (!geometry) {
          mark("rendered", false);
          return false;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(uniforms.uCenter, ...geometry.center);
        gl.uniform2f(uniforms.uHalf, ...geometry.half);
        gl.uniform2f(uniforms.uScale, ...geometry.scale);
        gl.uniform2f(uniforms.uPixelRatio, ...geometry.pixelRatio);
        gl.uniform2f(uniforms.uScreenHalf, ...geometry.screenHalf);
        gl.uniform2f(uniforms.uScreenRadius, ...geometry.screenRadius);
        gl.uniform1f(uniforms.uRadius, geometry.radius);
        gl.uniform1f(uniforms.uPx, 1);
        gl.uniform1f(uniforms.uSpot, spot);
        gl.uniform4fv(uniforms.uLineColor, palette.line);
        gl.uniform4fv(uniforms.uBaseColor, palette.base);
        gl.uniform4fv(uniforms.uGlowColor, palette.glow);
        gl.uniform1f(
          uniforms.uSpectrum,
          paletteStyle === "triad" ? 2 : paletteStyle === "spectrum" ? 1 : 0,
        );
        palette.stops.forEach((color, index) => {
          gl.uniform4fv(uniforms[`uStop${index + 1}`], color);
        });
        gl.uniform1f(
          uniforms.uIntensity,
          SETTINGS.intensity * (button.disabled ? SETTINGS.idleIntensity : 1),
        );
        gl.uniform2f(
          uniforms.uWindow,
          SETTINGS.shineSize / 360,
          SETTINGS.shineFade / 360 + 0.0001,
        );
        gl.uniform1f(uniforms.uThickness, SETTINGS.thickness);
        gl.uniform1f(uniforms.uGlow, glow ? SETTINGS.glow : 0);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        if (gl.isContextLost()) {
          mark("rendered", false);
          return false;
        }
        mark("rendered", true);
        return true;
      } catch {
        stop();
        release();
        mark("rendered", false);
        return false;
      }
    };
    const frame = (now: number) => {
      raf = null;
      if (!canAnimate()) {
        stop();
        return;
      }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      spot = wrap((spot ?? restSpot()) + (SETTINGS.speed / TAU) * dt);
      if (draw() && canAnimate()) raf = requestAnimationFrame(frame);
      else stop();
    };
    const sync = () => {
      stop();
      if (!available()) {
        mark("rendered", false);
        return;
      }
      if (!intersecting || document.hidden) return;
      if (draw() && canAnimate()) {
        mark("animated", true);
        raf = requestAnimationFrame(frame);
      }
    };
    const measure = (entry?: ResizeObserverEntry) => {
      const box = entry?.borderBoxSize?.[0];
      const buttonStyle = getComputedStyle(button);
      view.width = Math.max(
        1,
        box
          ? box.inlineSize
          : parseFloat(buttonStyle.width) || button.offsetWidth,
      );
      view.height = Math.max(
        1,
        box
          ? box.blockSize
          : parseFloat(buttonStyle.height) || button.offsetHeight,
      );
      view.ratio = Math.min(window.devicePixelRatio || 1, 3);
      // Bitmap resolution uses layout size, not the dialog's animated scale.
      const paintStyle = getComputedStyle(canvas);
      const paintBox = canvas.getBoundingClientRect();
      view.paintWidth = Math.max(
        1,
        parseFloat(paintStyle.width) || canvas.offsetWidth,
      );
      view.paintHeight = Math.max(
        1,
        parseFloat(paintStyle.height) || canvas.offsetHeight,
      );
      canvas.width = Math.max(1, Math.round(view.paintWidth * view.ratio));
      canvas.height = Math.max(1, Math.round(view.paintHeight * view.ratio));
      geometry = mapRimToCanvas({
        button: button.getBoundingClientRect(),
        canvas: paintBox,
        buttonWidth: view.width,
        buttonHeight: view.height,
        bitmapWidth: canvas.width,
        bitmapHeight: canvas.height,
        radius: safeRadius,
      });
      if (spot === null) spot = restSpot();
      sync();
    };
    const onResize = () => measure();
    const onTransformEnd = (event: Event) => {
      if (event.target instanceof Element && event.target.contains(button))
        measure();
    };
    const onThemeChange = () => {
      palette = readPalette();
      sync();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      stop();
      release();
      mark("rendered", false);
    };
    const onContextRestored = () => {
      if (disposed) return;
      lost = false;
      if (initialize()) measure();
      else mark("rendered", false);
    };

    if (!initialize()) return;
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) =>
            measure(entries.find((entry) => entry.target === button)),
          );
    resize?.observe(button);
    resize?.observe(canvas);
    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            intersecting = entries.some((entry) => entry.isIntersecting);
            sync();
          });
    intersection?.observe(button);
    const disabled = new MutationObserver(sync);
    disabled.observe(button, {
      attributes: true,
      attributeFilter: ["disabled"],
    });
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    motion.addEventListener("change", sync);
    window.addEventListener(APPEARANCE_CHANGE_EVENT, onThemeChange);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("animationend", onTransformEnd, true);
    document.addEventListener("transitionend", onTransformEnd, true);
    window.addEventListener("resize", onResize);
    measure();

    return () => {
      disposed = true;
      stop();
      resize?.disconnect();
      intersection?.disconnect();
      disabled.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      motion.removeEventListener("change", sync);
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, onThemeChange);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("animationend", onTransformEnd, true);
      document.removeEventListener("transitionend", onTransformEnd, true);
      window.removeEventListener("resize", onResize);
      release();
      mark("rendered", false);
    };
  }, [radius, paletteStyle, glow]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("intake-specular-light", className)}
      style={{ "--intake-light-size": `${(PAD + 1) * 2}px` } as CSSProperties}
      aria-hidden="true"
      data-rendered="false"
      data-exterior-glow={glow}
      data-animated="false"
      data-fallback-active="false"
      data-rim-thickness={SETTINGS.thickness}
      data-rim-space="screen-css"
    />
  );
}
