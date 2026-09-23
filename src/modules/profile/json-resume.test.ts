import { describe, expect, it } from "vitest";
import { createMasterDocument, exportJsonResume } from "./json-resume";

describe("JSON Resume boundary", () => {
  it("keeps application provenance out of a standard export", () => {
    const document = createMasterDocument(
      {
        basics: {
          name: "Mehmet Yalaz",
          email: "mehmet@example.test",
          summary: "38,000+ kayıt",
        },
        work: [{ name: "Example A.Ş.", highlights: ["7,300+ işlem"] }],
      },
      "tr-TR",
    );
    const exported = exportJsonResume(document);
    expect(exported.basics.name).toBe("Mehmet Yalaz");
    expect(exported).not.toHaveProperty("registry");
    expect(
      Object.values(document.registry).every(
        (claim) => claim.status === "verified",
      ),
    ).toBe(true);
  });

  it("marks imported facts as needing review", () => {
    const document = createMasterDocument(
      { basics: { name: "Imported person" } },
      "en-US",
      "needs_review",
    );
    expect(Object.values(document.registry)).toHaveLength(1);
    expect(Object.values(document.registry)[0]?.status).toBe("needs_review");
  });
});
