import { validate } from "@jsonresume/schema";
import {
  type ClaimRecord,
  type JsonResumeDocument,
  jsonResumeSchema,
  type MasterResumeDocument,
} from "./schema";

const randomUUID = () => crypto.randomUUID();

const visibleText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value))
    return value.map(visibleText).filter(Boolean).join("; ");
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !["id", "image", "url"].includes(key))
      .map(([, entry]) => visibleText(entry))
      .filter(Boolean)
      .join("; ");
  return "";
};

function tokens(text: string) {
  return {
    numbers: [...new Set(text.match(/\b\d[\d,.+%]*\b/g) ?? [])],
    dates: [
      ...new Set(text.match(/\b(?:19|20)\d{2}(?:[-/.]\d{1,2})?\b/g) ?? []),
    ],
    organizations: [],
    technologies: [],
    awards: [],
  };
}

export function createMasterDocument(
  resumeInput: unknown,
  locale: "tr-TR" | "en-US",
  status: "verified" | "needs_review" = "verified",
  statuses: Partial<Record<ClaimRecord["section"], ClaimRecord["status"]>> = {},
): MasterResumeDocument {
  const resume = jsonResumeSchema.parse(resumeInput) as JsonResumeDocument;
  const now = new Date().toISOString();
  const registry: Record<string, ClaimRecord> = {};
  const itemMetadata: MasterResumeDocument["itemMetadata"] = {};
  const addClaim = (
    section: ClaimRecord["section"],
    text: string,
    itemId = randomUUID(),
  ) => {
    if (!text) return;
    const claimStatus = statuses[section] ?? status;
    const id = randomUUID();
    itemMetadata[itemId] = { status: claimStatus, section };
    registry[id] = {
      id,
      itemId,
      section,
      text,
      locale,
      status: claimStatus,
      immutableTokens: tokens(text),
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
  };
  const basicsId = randomUUID();
  addClaim("basics", visibleText({ ...resume.basics, summary: "" }), basicsId);
  addClaim("summary", resume.basics.summary, randomUUID());
  for (const [section, items] of [
    ["work", resume.work],
    ["education", resume.education],
    ["projects", resume.projects],
    ["skills", resume.skills],
    ["languages", resume.languages],
    ["references", resume.references],
  ] as const)
    for (const item of items) {
      const itemId = typeof item.id === "string" ? item.id : randomUUID();
      item.id = itemId;
      addClaim(section, visibleText(item), itemId);
    }
  return { schemaVersion: "1.0", locale, resume, registry, itemMetadata };
}

export function exportJsonResume(document: MasterResumeDocument) {
  const compact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(compact);
    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== "")
        .map(([key, entry]) => [key, compact(entry)] as const)
        .filter(
          ([, entry]) =>
            !(
              entry &&
              typeof entry === "object" &&
              !Array.isArray(entry) &&
              Object.keys(entry).length === 0
            ),
        );
      return Object.fromEntries(entries);
    }
    return value;
  };
  const parsed = jsonResumeSchema.parse(document.resume);
  const { photoAssetId: _photoAssetId, ...basics } = parsed.basics;
  const resume = compact({ ...parsed, basics });
  let valid = false;
  validate(resume, (errors, result) => {
    valid = !errors && result;
  });
  if (!valid) throw new Error("INVALID_JSON_RESUME_EXPORT");
  return resume as JsonResumeDocument;
}

// Preserve exact source identities; edited text must be explicitly reviewed again.
export function reconcileMasterDocument(
  next: MasterResumeDocument,
  previous: MasterResumeDocument,
): MasterResumeDocument {
  if (JSON.stringify(next.resume) === JSON.stringify(previous.resume))
    return next;
  const rebuilt = createMasterDocument(
    next.resume,
    next.locale,
    "needs_review",
  );
  const oldClaims = Object.values(previous.registry);
  const used = new Set<string>();
  const registry: MasterResumeDocument["registry"] = {};
  const itemMetadata: MasterResumeDocument["itemMetadata"] = {};
  for (const claim of Object.values(rebuilt.registry)) {
    const exact = oldClaims.find(
      (entry) =>
        !used.has(entry.id) &&
        entry.section === claim.section &&
        entry.text === claim.text,
    );
    const old =
      exact ??
      oldClaims.find(
        (entry) =>
          !used.has(entry.id) &&
          entry.section === claim.section &&
          (entry.itemId === claim.itemId ||
            claim.section === "basics" ||
            claim.section === "summary"),
      );
    const record = old
      ? {
          ...claim,
          id: old.id,
          itemId: old.itemId,
          createdAt: old.createdAt,
          status:
            old.text === claim.text ? old.status : ("needs_review" as const),
        }
      : claim;
    if (old) used.add(old.id);
    registry[record.id] = record;
    itemMetadata[record.itemId] = {
      section: record.section,
      status: record.status,
    };
  }
  return { ...rebuilt, registry, itemMetadata };
}
