import assert from "node:assert/strict";
import test from "node:test";
import { readRimColor } from "./specular-rim-color";

const approximate = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 0.0000001);
};

test("secondary rim colors retain each requested alpha byte", () => {
  for (const [hex, channels] of [
    ["#4b1f0cd9", [75, 31, 12, 217]],
    ["#f9731661", [249, 115, 22, 97]],
  ] as const) {
    const color = readRimColor(hex, "#9a3412");
    assert.equal(color.length, 4);
    channels.forEach((channel, index) => {
      approximate(color[index], channel / 255);
    });
  }
});

test("opaque existing rim colors preserve their RGB values and full opacity", () => {
  for (const hex of ["#65cbed", "#35caff", "#00224c", "#9a3412", "#ffddb3"]) {
    const color = readRimColor(hex, "#000000");
    [1, 3, 5].forEach((offset, index) => {
      approximate(
        color[index],
        parseInt(hex.slice(offset, offset + 2), 16) / 255,
      );
    });
    assert.equal(color[3], 1);
  }
});

test("whitespace, uppercase and fully transparent stops are supported", () => {
  const color = readRimColor("  #FED7AA00  ", "#9a3412");
  approximate(color[0], 254 / 255);
  approximate(color[1], 215 / 255);
  approximate(color[2], 170 / 255);
  assert.equal(color[3], 0);
});

test("CSS-minified shorthand colors preserve the same RGB and alpha as their full forms", () => {
  for (const [short, full] of [
    ["#fff", "#ffffff"],
    [" #ABC ", "#aabbcc"],
    ["#b7a4", "#bb77aa44"],
    ["#0000", "#00000000"],
  ]) {
    assert.deepEqual(
      readRimColor(short, "#9a3412"),
      readRimColor(full, "#9a3412"),
    );
  }
  assert.deepEqual(
    readRimColor("invalid", "#fff"),
    new Float32Array([1, 1, 1, 1]),
  );
});

test("missing or malformed stops use the supplied fallback including its alpha", () => {
  for (const candidate of [
    "",
    "var(--unresolved)",
    "#12",
    "#12345",
    "#f973166",
    "#f973166zz",
  ]) {
    assert.deepEqual(
      readRimColor(candidate, "#4b1f0cd9"),
      readRimColor("#4b1f0cd9", "#000000"),
    );
  }
});
