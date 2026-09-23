import { expect, it, vi } from "vitest";
import { assessPdfText, extractPdfImport } from "./pdf-import";

it("uses embedded text for normal PDFs", async () => {
  const ocr = vi.fn();
  const result = await extractPdfImport(
    "Deniz Örnek\nOperasyon Analisti\nExcel ve SQL deneyimi",
    ocr,
  );
  expect(result.method).toBe("text");
  expect(ocr).not.toHaveBeenCalled();
});
it("runs OCR for scanned PDFs", async () => {
  const result = await extractPdfImport(
    "",
    async () => "Deniz Örnek\nDeneyim\nExcel ve SQL ile raporlama yaptı.",
  );
  expect(result.method).toBe("ocr");
  expect(result.text).toContain("Deniz Örnek");
});
it("offers a recoverable OCR failure signal", async () => {
  await expect(extractPdfImport("", async () => "")).rejects.toThrow(
    "OCR_EMPTY",
  );
  expect(assessPdfText(" ").needsOcr).toBe(true);
});
