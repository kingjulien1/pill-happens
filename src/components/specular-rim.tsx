"use client";

// Adapted from React Bits SpecularButton by David Haz (2026).
// MIT + Commons Clause; see /licenses/react-bits.txt.
// https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Components/SpecularButton
import { useEffect, useRef } from "react";

const PAD = 24;
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
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
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

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`;

const UNIFORMS = [
  "uCenter",
  "uHalf",
  "uRadius",
  "uPx",
  "uSpot",
  "uEntry",
  "uLineColor",
  "uBaseColor",
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

const rimPoint = (
  position: number,
  halfX: number,
  halfY: number,
  r: number,
): [number, number] => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  let s = wrap(position) * 4 * quarter;
  let signX = 1;
  let signY = 1;
  if (s > 3 * quarter) {
    s = 4 * quarter - s;
    signY = -1;
  } else if (s > 2 * quarter) {
    s -= 2 * quarter;
    signX = -1;
    signY = -1;
  } else if (s > quarter) {
    s = 2 * quarter - s;
    signX = -1;
  }
  let x = innerX - (s - innerY - arc);
  let y = halfY;
  if (s <= innerY) {
    x = halfX;
    y = s;
  } else if (s <= innerY + arc) {
    const angle = (s - innerY) / Math.max(r, 0.0001);
    x = innerX + Math.cos(angle) * r;
    y = innerY + Math.sin(angle) * r;
  }
  return [x * signX, y * signY];
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
  lineColor: new Float32Array([1, 216 / 255, 189 / 255]),
  baseColor: new Float32Array([249 / 255, 115 / 255, 22 / 255]),
  intensity: 1.35,
  idleIntensity: 0.35,
  shineSize: 39,
  shineFade: 61,
  thickness: 2.4,
  glow: 2,
  speed: 1.15,
};

/** Pointer-independent React Bits rim, leaving the host button's styles intact. */
export function SpecularRim({ radius = 22 }: { radius?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const view = { width: 1, height: 1, ratio: 1 };
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
      if (!available() || !program || !vao || spot === null) {
        mark("rendered", false);
        return false;
      }
      try {
        const { width, height } = view;
        const scaleX = canvas.width / (width + PAD * 2);
        const scaleY = canvas.height / (height + PAD * 2);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(
          uniforms.uCenter,
          (PAD + width / 2) * scaleX,
          (PAD + height / 2) * scaleY,
        );
        gl.uniform2f(
          uniforms.uHalf,
          (width / 2) * scaleX,
          (height / 2) * scaleY,
        );
        gl.uniform1f(uniforms.uRadius, cornerRadius() * scaleX);
        gl.uniform1f(uniforms.uPx, view.ratio);
        const [rimX, rimY] = rimPoint(
          spot,
          width / 2,
          height / 2,
          cornerRadius(),
        );
        const distance = Math.hypot(rimX, rimY);
        const pull =
          1 -
          Math.min(0.35 * (height / 2), distance) / Math.max(distance, 0.0001);
        gl.uniform1f(uniforms.uSpot, spot);
        gl.uniform2f(
          uniforms.uEntry,
          rimX * pull * scaleX,
          rimY * pull * scaleY,
        );
        gl.uniform3fv(uniforms.uLineColor, SETTINGS.lineColor);
        gl.uniform3fv(uniforms.uBaseColor, SETTINGS.baseColor);
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
        gl.uniform1f(uniforms.uGlow, SETTINGS.glow);
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
      view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth);
      view.height = Math.max(1, box ? box.blockSize : button.offsetHeight);
      view.ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(
        1,
        Math.round((view.width + PAD * 2) * view.ratio),
      );
      canvas.height = Math.max(
        1,
        Math.round((view.height + PAD * 2) * view.ratio),
      );
      if (spot === null) spot = restSpot();
      sync();
    };
    const onResize = () => measure();
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
        : new ResizeObserver((entries) => measure(entries[entries.length - 1]));
    resize?.observe(button);
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
    document.addEventListener("visibilitychange", sync);
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
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", onResize);
      release();
      mark("rendered", false);
    };
  }, [radius]);

  return (
    <canvas
      ref={canvasRef}
      className="intake-specular-light"
      aria-hidden="true"
      data-rendered="false"
      data-animated="false"
    />
  );
}
