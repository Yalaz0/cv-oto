import { expect, it } from "vitest";
import { demoResume } from "@/modules/demo/fixtures";
import {
  fromMasterProfile,
  fromProfile,
} from "@/modules/template/from-profile";
import { createMasterDocument, reconcileMasterDocument } from "./json-resume";

it("keeps source IDs but requires re-review of edited facts", () => {
  const original = createMasterDocument(demoResume, "tr-TR", "verified");
  const edited = structuredClone(original);
  edited.resume.work[0].position = "Director";
  const next = reconcileMasterDocument(edited, original);
  const originalWork = Object.values(original.registry).find(
    (c) => c.section === "work",
  );
  if (!originalWork) throw new Error("Missing fixture");
  expect(next.registry[originalWork.id].status).toBe("needs_review");
  expect(next.registry[originalWork.id].itemId).toBe(originalWork.itemId);
  const selected = Object.keys(next.registry);
  expect(JSON.stringify(fromProfile(next, selected))).not.toContain("Director");
  expect(JSON.stringify(original)).not.toContain("Director");
});
it("does not invent job requirements or include unselected sources", () => {
  const profile = createMasterDocument(demoResume, "tr-TR", "verified");
  const selected = Object.values(profile.registry)
    .filter((c) => c.section === "basics")
    .map((c) => c.id);
  const result = fromProfile(profile, selected);
  expect(result.basics.name).toBe("Deniz Örnek");
  expect(result.work).toEqual([]);
  expect(JSON.stringify(result)).not.toMatch(/SAP|AWS|Python/);
});

it("carries a persisted profile photo into the CV document", () => {
  const profile = createMasterDocument(demoResume, "tr-TR", "verified");
  profile.resume.basics.image = "/api/profile/photo";
  profile.resume.basics.photoAssetId = "user-id/profile.jpg";
  const result = fromProfile(profile, Object.keys(profile.registry));
  expect(result.basics.image).toBe("/api/profile/photo");
});

it("renders the editable master profile before claims are verified", () => {
  const profile = createMasterDocument(demoResume, "tr-TR", "needs_review");
  const preview = fromMasterProfile(profile);
  expect(preview.basics.name).toBe("Deniz Örnek");
  expect(preview.work.length).toBeGreaterThan(0);
  expect(preview.skills).toContain("Veri analizi");
});
