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
      github: profile.resume.basics.profiles.find(
        (item) => String(item.network).toLowerCase() === "github",
      )?.url as string | undefined,
      linkedin: profile.resume.basics.profiles.find(
        (item) => String(item.network).toLowerCase() === "linkedin",
      )?.url as string | undefined,
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
    display: profile.resume.meta
      ?.cvDisplaySettings as CvTemplateDocument["display"],
  };
}

// The master-profile preview intentionally reads the edit buffer directly.
// Application CV generation still uses fromProfile above and verified sources only.
export function fromMasterProfile(
  profile: MasterResumeDocument,
): CvTemplateDocument {
  const resume = profile.resume;
  const details = (item: Record<string, unknown>) => {
    if (Array.isArray(item.highlights))
      return item.highlights.filter(
        (value): value is string => typeof value === "string",
      );
    if (typeof item.details === "string")
      return item.details.split("\n").filter(Boolean);
    if (typeof item.summary === "string")
      return item.summary.split("\n").filter(Boolean);
    return [];
  };
  const entries = (items: Record<string, unknown>[]) =>
    items.map((item) => ({
      title: String(
        item.company ?? item.institution ?? item.name ?? item.reference ?? "",
      ),
      subtitle:
        String(item.position ?? item.area ?? item.studyType ?? "") || undefined,
      date:
        [item.startDate, item.endDate].filter(Boolean).join(" – ") || undefined,
      location: typeof item.location === "string" ? item.location : undefined,
      details: details(item),
    }));
  return {
    locale: profile.locale,
    basics: {
      name: resume.basics.name,
      title: resume.basics.label,
      email: resume.basics.email || undefined,
      phone: resume.basics.phone || undefined,
      location: resume.basics.location.city || undefined,
      url: resume.basics.url || undefined,
      image: resume.basics.image || undefined,
      github: resume.basics.profiles.find(
        (item) => String(item.network).toLowerCase() === "github",
      )?.url as string | undefined,
      linkedin: resume.basics.profiles.find(
        (item) => String(item.network).toLowerCase() === "linkedin",
      )?.url as string | undefined,
    },
    summary: resume.basics.summary || undefined,
    work: entries(resume.work),
    education: entries(resume.education),
    projects: entries(resume.projects),
    references: entries(resume.references),
    skills: resume.skills
      .map((item) => String(item.name ?? ""))
      .filter(Boolean),
    languages: resume.languages
      .map((item) => [item.language, item.fluency].filter(Boolean).join(" · "))
      .filter(Boolean),
    display: resume.meta?.cvDisplaySettings as CvTemplateDocument["display"],
  };
}
