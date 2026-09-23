import type { ClaimRecord } from "@/modules/profile/schema";

export type TruthIssue = {
  code: "UNKNOWN_SOURCE" | "UNVERIFIED_SOURCE" | "UNSUPPORTED_NUMBER";
  statementId: string;
  message: string;
};
export type GeneratedStatement = {
  id: string;
  text: string;
  sourceClaimIds: string[];
};

const numericTokens = (text: string) => text.match(/\b\d[\d,.+%]*\b/g) ?? [];

export function validateStatements(
  statements: GeneratedStatement[],
  claims: ClaimRecord[],
): TruthIssue[] {
  const sources = new Map(claims.map((claim) => [claim.id, claim]));
  return statements.flatMap((statement) => {
    const referenced = statement.sourceClaimIds.map((id) => sources.get(id));
    const issues: TruthIssue[] = [];
    if (
      statement.sourceClaimIds.length === 0 ||
      referenced.some((claim) => !claim)
    )
      issues.push({
        code: "UNKNOWN_SOURCE",
        statementId: statement.id,
        message: "İfade doğrulanmış kaynak içermiyor.",
      });
    if (referenced.some((claim) => claim && claim.status !== "verified"))
      issues.push({
        code: "UNVERIFIED_SOURCE",
        statementId: statement.id,
        message: "İfade inceleme bekleyen kaynağa bağlı.",
      });
    const allowedNumbers = new Set(
      referenced.flatMap((claim) => claim?.immutableTokens.numbers ?? []),
    );
    if (
      numericTokens(statement.text).some((token) => !allowedNumbers.has(token))
    )
      issues.push({
        code: "UNSUPPORTED_NUMBER",
        statementId: statement.id,
        message: "İfadede kaynakta bulunmayan sayı var.",
      });
    return issues;
  });
}

export function canAcceptGeneratedDocument({
  issues,
  semanticVerificationAvailable,
}: {
  issues: TruthIssue[];
  semanticVerificationAvailable: boolean;
}) {
  return semanticVerificationAvailable && issues.length === 0;
}
