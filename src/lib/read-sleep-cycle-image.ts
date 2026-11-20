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
    const ratio = image.naturalWidth / image.naturalHeight;
    if (Math.abs(ratio - 1285 / 2450) > 0.035)
      throw Error(
        "Choose the full portrait share image exported by Sleep Cycle.",
      );
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
          (x * image.naturalWidth) / 1285,
          (y * image.naturalHeight) / 2450,
          (w * image.naturalWidth) / 1285,
          (h * image.naturalHeight) / 2450,
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
      if (!/sleep\s*cycle/i.test(brand.data.text))
        throw Error(
          "Couldn’t recognize this layout. Use the uncropped Sleep Cycle share image.",
        );
      const found: ReportValues = {};
      for (const [index, [key, x, y, w, h]] of cells.entries()) {
        signal.throwIfAborted();
        const result = await worker.recognize(
          crop(x, y, w, h, key === "reportScore" ? 195 : 66),
        );
        const value = readReportValue(key, result.data.text);
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
