import type { MasterResumeDocument } from "@/modules/profile/schema";
import type { CvTemplateDocument } from "./types";

export function fromProfile(
  profile: MasterResumeDocument,
  selected: string[],
  locale = profile.locale,
): CvTemplateDocument {
  const claims = Object.values(profile.registry).filter(
    (claim) => claim.status === "verified" && selected.includes(claim.id),
  );
  const entries = (section: string) =>
    claims
      .filter((claim) => claim.section === section)
      .map((claim) => {
        const [title, ...details] = claim.text.split("; ");
        return { title, details };
      });
  const basics = claims.some((claim) => claim.section === "basics")
    ? profile.resume.basics
    : null;
  return {
    locale,
    basics: {
      name: basics?.name ?? "",
      title: basics?.label ?? "",
      email: basics?.email,
      phone: basics?.phone,
      location: basics?.location.city,
      url: basics?.url,
      image: basics?.image || undefined,
    },
    summary: claims
      .filter((claim) => claim.section === "summary")
      .map((claim) => claim.text)
      .join("\n"),
    work: entries("work"),
    education: entries("education"),
    projects: entries("projects"),
    references: entries("references"),
    skills: claims
      .filter((claim) => claim.section === "skills")
      .map((claim) => claim.text),
    languages: claims
      .filter((claim) => claim.section === "languages")
      .map((claim) => claim.text),
  };
}
