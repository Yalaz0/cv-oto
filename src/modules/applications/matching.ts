import type { ClaimRecord } from "@/modules/profile/schema";

const stopwords = new Set([
  "ve",
  "ile",
  "için",
  "bir",
  "the",
  "and",
  "with",
  "for",
  "this",
  "that",
  "gibi",
  "olan",
]);
const words = (text: string) => [
  ...new Set(
    (
      text.toLocaleLowerCase("tr-TR").match(/[\p{L}\p{N}+#.-]{2,}/gu) ?? []
    ).filter((word) => !stopwords.has(word)),
  ),
];

export function analyzeJobDescription(text: string) {
  const terms = words(text);
  return {
    requirements: terms.slice(0, 30),
    detectedLocale: /[ğüşöçıİ]/i.test(text) ? "tr-TR" : "en-US",
  } as const;
}

export function rankVerifiedClaims(
  jobDescription: string,
  claims: ClaimRecord[],
) {
  const requirements = new Set(words(jobDescription));
  return claims
    .filter((claim) => claim.status === "verified")
    .map((claim) => {
      const matchedTerms = words(claim.text).filter((term) =>
        requirements.has(term),
      );
      return { claimId: claim.id, score: matchedTerms.length, matchedTerms };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.claimId.localeCompare(b.claimId));
}
