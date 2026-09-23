import { z } from "zod";

export const localeSchema = z.enum(["tr-TR", "en-US"]);
export const claimStatusSchema = z.enum([
  "needs_review",
  "verified",
  "rejected",
]);
export const sectionSchema = z.enum([
  "basics",
  "summary",
  "work",
  "education",
  "projects",
  "skills",
  "languages",
  "references",
]);

const stringArray = z.array(z.string().trim().min(1).max(500)).max(80);
const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  details: z.string().max(8_000).default(""),
});

export const jsonResumeSchema = z.object({
  basics: z
    .object({
      name: z.string().trim().max(150).default(""),
      label: z.string().trim().max(200).default(""),
      email: z.union([z.literal(""), z.email()]).default(""),
      phone: z.string().trim().max(50).default(""),
      url: z.union([z.literal(""), z.url()]).default(""),
      image: z.string().max(2_000).default(""),
      summary: z.string().max(4_000).default(""),
      location: z
        .object({
          address: z.string().max(300).default(""),
          city: z.string().max(100).default(""),
          region: z.string().max(100).default(""),
          postalCode: z.string().max(30).default(""),
          countryCode: z.string().max(10).default(""),
        })
        .default({
          address: "",
          city: "",
          region: "",
          postalCode: "",
          countryCode: "",
        }),
      profiles: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
    })
    .default({
      name: "",
      label: "",
      email: "",
      phone: "",
      url: "",
      image: "",
      summary: "",
      location: {
        address: "",
        city: "",
        region: "",
        postalCode: "",
        countryCode: "",
      },
      profiles: [],
    }),
  work: z.array(z.record(z.string(), z.unknown())).max(30).default([]),
  education: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  projects: z.array(z.record(z.string(), z.unknown())).max(30).default([]),
  skills: z.array(z.record(z.string(), z.unknown())).max(40).default([]),
  languages: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  references: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  volunteer: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  awards: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  certificates: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  publications: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  interests: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const claimSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  section: sectionSchema,
  text: z.string().trim().min(1).max(8_000),
  locale: localeSchema,
  status: claimStatusSchema,
  immutableTokens: z.object({
    numbers: stringArray,
    dates: stringArray,
    organizations: stringArray,
    technologies: stringArray,
    awards: stringArray,
  }),
  tags: z.array(z.string().trim().min(1).max(80)).max(30),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const masterResumeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  locale: localeSchema,
  resume: jsonResumeSchema,
  registry: z.record(z.string().uuid(), claimSchema),
  itemMetadata: z.record(
    z.string().uuid(),
    z.object({ status: claimStatusSchema, section: sectionSchema }),
  ),
});

export type MasterResumeDocument = z.infer<typeof masterResumeSchema>;
export type ClaimRecord = z.infer<typeof claimSchema>;
export type JsonResumeDocument = z.infer<typeof jsonResumeSchema>;
export type ResumeItem = z.infer<typeof itemSchema>;

export const profileSaveSchema = z.object({
  id: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
  document: masterResumeSchema,
  changeSource: z.enum(["manual", "import"]),
});
