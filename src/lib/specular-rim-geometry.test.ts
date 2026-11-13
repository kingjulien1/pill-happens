import assert from "node:assert/strict";
import test from "node:test";
import { mapRimToCanvas } from "./specular-rim-geometry";

const cases = [
  {
    name: "a dialog measured during its scale entrance",
    button: { left: 200, top: 500, width: 380, height: 49.4 },
    canvas: { left: 138.25, top: 438.25, width: 503.5, height: 172.9 },
    buttonWidth: 400,
    buttonHeight: 52,
    bitmapWidth: 1060,
    bitmapHeight: 364,
    radius: 16,
  },
  {
    name: "a viewport-capped mobile canvas and fractional button width",
    button: { left: 24, top: 700, width: 271.625, height: 64 },
    canvas: { left: -0.1875, top: 635, width: 320, height: 194 },
    buttonWidth: 271.625,
    buttonHeight: 64,
    bitmapWidth: 640,
    bitmapHeight: 388,
    radius: 22,
  },
  {
    name: "an asymmetric canvas offset and nonuniform ancestor scale",
    button: { left: 135.3, top: 211.1, width: 330, height: 39 },
    canvas: { left: 81.3, top: 167.1, width: 437.25, height: 136.5 },
    buttonWidth: 400,
    buttonHeight: 52,
    bitmapWidth: 1590,
    bitmapHeight: 546,
    radius: 16,
  },
];

for (const fixture of cases) {
  test(`the rendered rim follows the actual button edges for ${fixture.name}`, () => {
    const geometry = mapRimToCanvas(fixture);
    assert.ok(geometry);
    const { button, canvas, bitmapWidth, bitmapHeight } = fixture;
    const [cx, cy] = geometry.center;
    const [sx, sy] = geometry.scale;
    const [hx, hy] = geometry.half;
    // Reproject the shader's four outer edge points into the visible page.
    const edges = [
      canvas.left + ((cx - hx * sx) / bitmapWidth) * canvas.width,
      canvas.left + ((cx + hx * sx) / bitmapWidth) * canvas.width,
      canvas.top + (1 - (cy + hy * sy) / bitmapHeight) * canvas.height,
      canvas.top + (1 - (cy - hy * sy) / bitmapHeight) * canvas.height,
    ];
    const expected = [
      button.left,
      button.left + button.width,
      button.top,
      button.top + button.height,
    ];
    edges.forEach((edge, index) => {
      assert.ok(Math.abs(edge - expected[index]) < 0.000001);
    });
    assert.equal(geometry.radius, fixture.radius);
  });

  test(`a 3 CSS-pixel inward band stays uniform for ${fixture.name}`, () => {
    const geometry = mapRimToCanvas(fixture);
    assert.ok(geometry);
    const [px, py] = geometry.pixelRatio;
    const [rx, ry] = geometry.screenRadius;
    const [hx, hy] = geometry.screenHalf;
    assert.equal(px, fixture.bitmapWidth / fixture.canvas.width);
    assert.equal(py, fixture.bitmapHeight / fixture.canvas.height);
    for (const angle of [
      0,
      Math.PI / 8,
      Math.PI / 4,
      (Math.PI * 3) / 8,
      Math.PI / 2,
    ]) {
      const outside = [
        hx - rx + rx * Math.cos(angle),
        hy - ry + ry * Math.sin(angle),
      ];
      const nx = Math.cos(angle) / rx;
      const ny = Math.sin(angle) / ry;
      const normalLength = Math.hypot(nx, ny);
      const inside = [
        outside[0] - (3 * nx) / normalLength,
        outside[1] - (3 * ny) / normalLength,
      ];
      const outerBitmap = [
        geometry.center[0] + outside[0] * px,
        geometry.center[1] + outside[1] * py,
      ];
      const innerBitmap = [
        geometry.center[0] + inside[0] * px,
        geometry.center[1] + inside[1] * py,
      ];
      const cssWidth = Math.hypot(
        ((outerBitmap[0] - innerBitmap[0]) / fixture.bitmapWidth) *
          fixture.canvas.width,
        ((outerBitmap[1] - innerBitmap[1]) / fixture.bitmapHeight) *
          fixture.canvas.height,
      );
      assert.ok(Math.abs(cssWidth - 3) < 0.000001);
    }
  });
}

test("the outline remains valid for small or temporarily hidden buttons", () => {
  assert.equal(mapRimToCanvas({ ...cases[0], buttonWidth: 0 }), null);
  assert.equal(
    mapRimToCanvas({ ...cases[0], canvas: { ...cases[0].canvas, width: 0 } }),
    null,
  );
  assert.equal(mapRimToCanvas({ ...cases[0], bitmapHeight: NaN }), null);
  assert.equal(mapRimToCanvas({ ...cases[0], radius: 100 })?.radius, 26);
  assert.equal(mapRimToCanvas({ ...cases[0], radius: -8 })?.radius, 0);
});
