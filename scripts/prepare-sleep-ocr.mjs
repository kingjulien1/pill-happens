import { copyFile, mkdir } from "node:fs/promises";

const destination = "public/sleep-ocr";
await mkdir(destination, { recursive: true });
const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  [
    "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
  ...["", "-simd", "-relaxedsimd"].map((variant) => {
    const name = `tesseract-core${variant}-lstm.wasm.js`;
    return ["tesseract.js-core/" + name, name];
  }),
];
await Promise.all(
  files.map(([source, name]) =>
    copyFile("node_modules/" + source, destination + "/" + name),
  ),
);
