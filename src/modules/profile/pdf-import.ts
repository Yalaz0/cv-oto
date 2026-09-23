export type ImportMethod = "text" | "ocr";
export type PdfImportResult = {
  text: string;
  method: ImportMethod;
  needsOcr: boolean;
};

// A page with fewer than 30 meaningful characters is treated as image-only.
// This avoids sending ordinary digital PDFs through the slower OCR path.
export function assessPdfText(text: string): PdfImportResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  return {
    text: normalized,
    method: "text",
    needsOcr: normalized.replace(/[^\p{L}\p{N}]/gu, "").length < 30,
  };
}

export async function extractPdfImport(
  text: string,
  ocr: () => Promise<string>,
): Promise<PdfImportResult> {
  const assessed = assessPdfText(text);
  if (!assessed.needsOcr) return assessed;
  const ocrText = (await ocr()).replace(/\s+/g, " ").trim();
  if (ocrText.replace(/[^\p{L}\p{N}]/gu, "").length < 30)
    throw new Error("OCR_EMPTY");
  return { text: ocrText, method: "ocr", needsOcr: false };
}
