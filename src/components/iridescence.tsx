"use client";

/**
 * Iridescence by David Haz / React Bits, adapted for the passive page canvas.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause; /licenses/react-bits.txt.
 * Source pinned at d01aa914dcbe76da8b2923ebf872b5c8b1066e4c:
 * https://github.com/DavidHDev/react-bits/tree/d01aa914dcbe76da8b2923ebf872b5c8b1066e4c/src/ts-default/Backgrounds/Iridescence
 * The upstream field, pointer sheen and click swirls are omitted because both
 * interactions are disabled. The passive shader and its defaults are retained.
 */
import { useEffect, useRef } from "react";
import { APP_IRIDESCENCE } from "@/lib/app-theme";
import {
  getBackgroundFrameElapsed,
  getBackgroundResolution,
} from "@/lib/background-rendering";
import styles from "./iridescence.module.css";

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uScale;
uniform float uRotation;
uniform int uDetail;
uniform float uWarp;
uniform float uHue;
uniform float uSaturation;
uniform float uBrightness;
uniform float uContrast;
uniform float uGrain;
uniform float uFade;
uniform float uOpacity;
in vec2 vUv;
out vec4 outColor;

vec3 hueRotate(vec3 c, float angle) {
  const vec3 k = vec3(0.57735027);
  float ca = cos(angle);
  return c * ca + cross(k, c) * sin(angle) + k * dot(k, c) * (1.0 - ca);
}
float smootherstep(float edge, float x) {
  float t = clamp(x / edge, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv * 2.0 - 1.0) * uResolution / mr;
  float c = cos(uRotation);
  float s = sin(uRotation);
  uv = mat2(c, -s, s, c) * uv / uScale;
  float d = -uTime * 0.5;
  float a = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uDetail) break;
    float fi = float(i);
    a += cos(fi - d - a * uv.x * uWarp);
    d += sin(uv.y * fi + a);
  }
  d += uTime * 0.5;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  col = hueRotate(col, uHue);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  col += (hash(gl_FragCoord.xy) - 0.5) * uGrain * 0.12;
  col = clamp(col, 0.0, 1.0);
  float alpha = uOpacity;
  if (uFade > 0.0) {
    vec2 px = vUv * uResolution;
    float edge = uFade * mr * 0.5;
    alpha *= smootherstep(edge, px.x) * smootherstep(edge, uResolution.x - px.x);
    alpha *= smootherstep(edge, px.y) * smootherstep(edge, uResolution.y - px.y);
  }
  outColor = vec4(col * alpha, alpha);
}`;

function createScene(gl: WebGL2RenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const dispose = () => {
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
  };
  if (!vertex || !fragment || !program || !buffer) {
    dispose();
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform3f(uniform("uColor"), ...APP_IRIDESCENCE.colorRgb);
  gl.uniform1f(uniform("uScale"), APP_IRIDESCENCE.scale);
  gl.uniform1f(
    uniform("uRotation"),
    (APP_IRIDESCENCE.rotation * Math.PI) / 180,
  );
  gl.uniform1i(uniform("uDetail"), APP_IRIDESCENCE.detail);
  gl.uniform1f(uniform("uWarp"), APP_IRIDESCENCE.warp);
  gl.uniform1f(uniform("uHue"), (APP_IRIDESCENCE.hueShift * Math.PI) / 180);
  gl.uniform1f(uniform("uSaturation"), APP_IRIDESCENCE.saturation);
  gl.uniform1f(uniform("uBrightness"), APP_IRIDESCENCE.brightness);
  gl.uniform1f(uniform("uContrast"), APP_IRIDESCENCE.contrast);
  gl.uniform1f(uniform("uGrain"), APP_IRIDESCENCE.grain);
  gl.uniform1f(uniform("uFade"), APP_IRIDESCENCE.fade);
  gl.uniform1f(uniform("uOpacity"), APP_IRIDESCENCE.opacity);
  const resolution = uniform("uResolution");
  const time = uniform("uTime");
  return {
    dispose,
    draw(phase: number, width: number, height: number) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(time, phase);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

/** One persistent, input-inert background; SSR always retains its CSS still. */
export function Iridescence() {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const releaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!layer || !canvas) return;
    // StrictMode immediately reclaims the same canvas after its trial cleanup.
    // Release a genuinely abandoned context on the next task, never underneath
    // the replacement effect's synchronous setup.
    if (releaseRef.current !== null) clearTimeout(releaseRef.current);
    releaseRef.current = null;
    layer.dataset.ready = "false";
    let gl: WebGL2RenderingContext | null;
    try {
      gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    if (!gl) return;
    const context = gl;
    const releaseLater = () => {
      releaseRef.current = setTimeout(() => {
        releaseRef.current = null;
        context.getExtension("WEBGL_lose_context")?.loseContext();
      }, 0);
    };
    let scene = createScene(gl);
    if (!scene) return releaseLater;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    let alive = true;
    let lost = false;
    let visible = true;
    let raf = 0;
    let phase = 0;
    let last: number | null = null;
    let width = 1;
    let height = 1;
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    };
    const draw = () => {
      if (!scene || lost || !alive || document.hidden || !visible) return;
      scene.draw(phase, width, height);
      layer.dataset.ready = "true";
    };
    const frame = (now: number) => {
      raf = 0;
      if (!alive || lost || !visible || document.hidden) return;
      if (!motion.matches)
        phase += getBackgroundFrameElapsed(now, last) * APP_IRIDESCENCE.speed;
      last = now;
      draw();
      if (!motion.matches) raf = requestAnimationFrame(frame);
      else last = null;
    };
    const wake = () => {
      if (alive && scene && !lost && visible && !document.hidden && !raf)
        raf = requestAnimationFrame(frame);
    };
    const resize = () => {
      if (lost || !alive) return;
      // Use the overscanned canvas dimensions, keeping the shader undistorted.
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      const resolution = getBackgroundResolution({
        width,
        height,
        dpr: window.devicePixelRatio,
        maxDpr: phone.matches ? 1.25 : 1.5,
        maxPixels: phone.matches ? 750_000 : 1_800_000,
      });
      if (canvas.width !== resolution.width) canvas.width = resolution.width;
      if (canvas.height !== resolution.height)
        canvas.height = resolution.height;
      draw();
      wake();
    };
    const syncMotion = () => {
      stop();
      draw();
      wake();
    };
    const syncVisibility = () => {
      stop();
      wake();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      layer.dataset.ready = "false";
      stop();
      scene = null;
    };
    const onRestored = () => {
      if (!alive) return;
      scene = createScene(context);
      lost = false;
      if (scene) resize();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(layer);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      stop();
      wake();
    });
    intersection.observe(layer);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("resize", resize);
    motion.addEventListener("change", syncMotion);
    phone.addEventListener("change", resize);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    resize();
    return () => {
      alive = false;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", syncMotion);
      phone.removeEventListener("change", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      layer.dataset.ready = "false";
      scene?.dispose();
      releaseLater();
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className={styles.field}
      data-iridescence=""
      data-color={APP_IRIDESCENCE.color}
      data-mouse-react="false"
      data-click-swirl="false"
      data-ready="false"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.overlay} />
    </div>
  );
}
