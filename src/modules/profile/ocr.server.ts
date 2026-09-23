import "server-only";
import sharp from "sharp";

export async function recognizePdfWithOcr(pdf: Buffer): Promise<string> {
  // Sharp uses the maintained libvips PDF loader to render the first two pages.
  // Tesseract language data is cached by the worker between calls when supported.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["tur", "eng"], 1, {
    logger: () => undefined,
  });
  try {
    const metadata = await sharp(pdf, { density: 200, pages: 2 }).metadata();
    const pages = Math.min(metadata.pages ?? 1, 2);
    const text: string[] = [];
    for (let page = 0; page < pages; page++) {
      const image = await sharp(pdf, { density: 200, page })
        .resize({ width: 2200, withoutEnlargement: true })
        .grayscale()
        .normalize()
        .png()
        .toBuffer();
      const result = await worker.recognize(image);
      text.push(result.data.text);
    }
    return text.join("\n");
  } finally {
    await worker.terminate();
  }
}
