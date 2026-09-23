import { describe, expect, it } from "vitest";
import { analyzeJobDescription, rankVerifiedClaims } from "./matching";

const claim = (
  id: string,
  text: string,
  status: "verified" | "needs_review" = "verified",
) => ({
  id,
  itemId: id,
  section: "skills" as const,
  text,
  locale: "tr-TR" as const,
  status,
  immutableTokens: {
    numbers: [],
    dates: [],
    organizations: [],
    technologies: [],
    awards: [],
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
describe("deterministic job matching", () => {
  it("ranks only verified claims and never invents a missing skill", () => {
    const ranked = rankVerifiedClaims(
      "SAP ve proje yönetimi deneyimi aranıyor",
      [
        claim("a", "Proje yönetimi ve raporlama"),
        claim("b", "AWS sertifikası"),
        claim("c", "SAP", "needs_review"),
      ],
    );
    expect(ranked.map((item) => item.claimId)).toEqual(["a"]);
  });
  it("extracts stable, deduplicated requirement terms", () =>
    expect(
      analyzeJobDescription("Analiz ve analiz becerisi").requirements.filter(
        (term) => term === "analiz",
      ),
    ).toHaveLength(1));
});
