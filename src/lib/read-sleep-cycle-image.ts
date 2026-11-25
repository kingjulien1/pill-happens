import {
  readReportValue,
  type ReportKey,
  type ReportValues,
} from "./sleep-cycle-report";

// Value areas on the portrait Sleep Cycle share card, in reference-image pixels.
// Cropping individual cells avoids reading the graph's hour ticks as measurements.
const cells: [ReportKey, number, number, number, number][] = [
  ["reportScore", 556, 123, 170, 89],
  ["awakeMinutes", 300, 1070, 230, 76],
  ["dreamMinutes", 848, 1070, 270, 76],
  ["lightMinutes", 275, 1164, 245, 76],
  ["deepMinutes", 812, 1164, 265, 76],
  ["lightsOut", 195, 1475, 300, 92],
  ["gotUp", 788, 1475, 305, 92],
  ["fallAsleepMinutes", 194, 1762, 350, 90],
  ["regularity", 790, 1762, 280, 90],
  ["snoringMinutes", 193, 2049, 300, 91],
  ["coughingRate", 788, 2049, 330, 91],
];

// The orange app mark near the bottom and the score arc at the top stay in
// the same places on the report even when iOS frames it with share controls.
function reportFrame(image: HTMLImageElement) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const ratio = width / height;
  const fallback = () => {
    if (Math.abs(ratio - 1285 / 2450) <= 0.035)
      return { x: 0, y: 0, width, height };
    throw Error(
      "Choose the full portrait report or a share preview with the entire report visible.",
    );
  };
  if (Math.abs(ratio - 1285 / 2450) < 0.003) return fallback();
  if (ratio < 0.3 || ratio > 1) return fallback();
  const sample = document.createElement("canvas");
  sample.width = Math.min(400, width);
  const scale = sample.width / width;
  sample.height = Math.round(height * scale);
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback();
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);
  const orange = (x: number, y: number) => {
    const i = (y * sample.width + x) * 4;
    return (
      data[i] > 225 &&
      data[i + 1] >= 70 &&
      data[i + 1] < 190 &&
      data[i + 2] < 55
    );
  };
  let left = sample.width,
    right = -1,
    top = sample.height,
    bottom = -1;
  for (let y = Math.floor(sample.height * 0.65); y < sample.height; y++) {
    for (
      let x = Math.floor(sample.width * 0.22);
      x < sample.width * 0.49;
      x++
    ) {
      if (!orange(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = y;
    }
  }
  const badgeWidth = right - left + 1;
  if (
    badgeWidth < sample.width * 0.035 ||
    badgeWidth > sample.width * 0.09 ||
    Math.abs(badgeWidth - (bottom - top + 1)) > 3
  )
    return fallback();
  let unit = badgeWidth / 96;
  const badgeCenter = (left + right + 1) / 2;
  const center = Math.round(badgeCenter + (642 - 446) * unit);
  const estimate = top - (2294 - 54) * unit;
  search: for (
    let y = Math.max(0, Math.floor(estimate - sample.height * 0.05));
    y <= Math.min(sample.height - 1, estimate + sample.height * 0.05);
    y++
  ) {
    for (
      let x = Math.max(0, center - 8);
      x <= Math.min(sample.width - 1, center + 8);
      x++
    ) {
      if (orange(x, y)) {
        unit = (top - y) / (2294 - 54);
        break search;
      }
    }
  }
  const x = (badgeCenter - 446 * unit) / scale,
    y = (top - 2294 * unit) / scale;
  const w = (1285 * unit) / scale,
    h = (2450 * unit) / scale;
  if (x < -4 || y < -4 || x + w > width + 4 || y + h > height + 4)
    return fallback();
  return { x, y, width: w, height: h };
}

export async function readSleepCycleImage(
  file: File,
  signal: AbortSignal,
  progress: (count: number) => void,
) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Choose an image smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const frame = reportFrame(image);
    const { createWorker, OEM, PSM } = await import("tesseract.js");
    signal.throwIfAborted();
    const worker = await createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: "/sleep-ocr/worker.min.js",
      corePath: "/sleep-ocr",
      langPath: "/sleep-ocr",
      workerBlobURL: false,
    });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
      const crop = (
        x: number,
        y: number,
        w: number,
        h: number,
        threshold: number,
      ) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw Error("Image reading is unavailable in this browser.");
        ctx.drawImage(
          image,
          frame.x + (x * frame.width) / 1285,
          frame.y + (y * frame.height) / 2450,
          (w * frame.width) / 1285,
          (h * frame.height) / 2450,
          0,
          0,
          w,
          h,
        );
        const pixels = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const ink = pixels.data[i + 1] > threshold ? 0 : 255;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = ink;
        }
        ctx.putImageData(pixels, 0, 0);
        return canvas;
      };
      signal.throwIfAborted();
      const brand = await worker.recognize(crop(504, 2283, 435, 116, 100));
      if (!/sleep\s*cycle/i.test(brand.data.text)) {
        // The share preview's page indicator can cover the wordmark.
        const tile = await worker.recognize(crop(95, 1370, 345, 72, 48));
        if (!/went\s*to\s*bed/i.test(tile.data.text))
          throw Error(
            "Couldn’t recognize the Sleep Cycle layout. Choose the full portrait report.",
          );
      }
      const found: ReportValues = {};
      for (const [index, [key, x, y, w, h]] of cells.entries()) {
        signal.throwIfAborted();
        const result = await worker.recognize(
          crop(x, y, w, h, key === "reportScore" ? 195 : 66),
        );
        let value = readReportValue(key, result.data.text);
        if (
          (value === undefined &&
            (key === "snoringMinutes" || key === "deepMinutes")) ||
          (key === "coughingRate" && !value?.includes("."))
        ) {
          // These tiles can print dark units beside a bright zero or fractional rate.
          if (key === "coughingRate")
            await worker.setParameters({
              tessedit_char_whitelist: "0123456789.,",
              tessedit_pageseg_mode: PSM.SINGLE_WORD,
            });
          const numbers = crop(x, y, w, h, 135);
          const retry = await worker.recognize(numbers);
          if (key === "coughingRate") {
            value =
              rateWithDecimal(numbers, retry.data.text) ??
              rateWithDecimal(numbers, result.data.text) ??
              value;
            await worker.setParameters({
              tessedit_char_whitelist: "",
              tessedit_pageseg_mode: PSM.SINGLE_LINE,
            });
          } else {
            value = readReportValue(key, retry.data.text);
          }
        }
        if (value !== undefined) found[key] = value;
        progress(index + 1);
      }
      return found;
    } finally {
      await worker.terminate();
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A decimal point is sometimes visible in the image but dropped by the OCR.
// Separate digit columns on the bright-number crop before accepting an integer.
function rateWithDecimal(canvas: HTMLCanvasElement, raw: string) {
  const text = raw.trim().replace(/\s+/g, "").replace(/\/h$/i, "");
  if (!/^\d+$/.test(text)) return readReportValue("coughingRate", raw);
  const { width, height } = canvas;
  const context = canvas.getContext("2d");
  if (!context) return;
  const { data } = context.getImageData(0, 0, width, height);
  const marks: { top: number; bottom: number }[] = [];
  let current: (typeof marks)[number] | undefined;
  for (let x = 0; x < width; x++) {
    let top = height,
      bottom = -1;
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4] === 0) {
        top = Math.min(top, y);
        bottom = y;
      }
    }
    if (bottom === -1) current = undefined;
    else if (current) {
      current.top = Math.min(current.top, top);
      current.bottom = Math.max(current.bottom, bottom);
    } else {
      current = { top, bottom };
      marks.push(current);
    }
  }
  if (marks.length === text.length + 1) {
    const tallest = Math.max(...marks.map((m) => m.bottom - m.top + 1));
    const baseline = Math.max(...marks.map((m) => m.bottom));
    const dots = marks.map(
      (m) =>
        m.bottom - m.top + 1 < tallest / 3 && baseline - m.bottom < tallest / 5,
    );
    const at = dots.indexOf(true);
    if (at > 0 && at < marks.length - 1 && dots.lastIndexOf(true) === at) {
      return readReportValue(
        "coughingRate",
        text.slice(0, at) + "." + text.slice(at),
      );
    }
  }
  return readReportValue("coughingRate", raw);
}
