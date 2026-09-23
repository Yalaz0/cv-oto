import { describe, expect, it } from "vitest";
import { canAcceptGeneratedDocument, validateStatements } from "./guard";

const claim = {
  id: "source",
  itemId: "item",
  section: "work" as const,
  text: "7,300+ işlem",
  locale: "tr-TR" as const,
  status: "verified" as const,
  immutableTokens: {
    numbers: ["7,300+"],
    dates: [],
    organizations: [],
    technologies: [],
    awards: [],
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
describe("Truth Guard", () => {
  it("rejects unsupported numeric claims", () =>
    expect(
      validateStatements(
        [{ id: "s", text: "8,000+ işlem", sourceClaimIds: ["source"] }],
        [claim],
      ).map((issue) => issue.code),
    ).toContain("UNSUPPORTED_NUMBER"));
  it("rejects unknown provenance", () =>
    expect(
      validateStatements(
        [{ id: "s", text: "Metin", sourceClaimIds: [] }],
        [claim],
      )[0]?.code,
    ).toBe("UNKNOWN_SOURCE"));
  it("fails closed without semantic verification", () =>
    expect(
      canAcceptGeneratedDocument({
        issues: [],
        semanticVerificationAvailable: false,
      }),
    ).toBe(false));
});
