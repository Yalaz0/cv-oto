import { z } from "zod";

const text = z.string().max(8000);
const entry = z.object({
  title: text,
  subtitle: text.optional(),
  date: text.optional(),
  location: text.optional(),
  details: z.array(text).max(80),
});
export const manualDocumentSchema = z.object({
  schemaVersion: z.literal("1.0"),
  templateId: z.literal("mehmet-yalaz-v1"),
  origin: z.literal("user"),
  selectedClaimIds: z.array(z.string().uuid()).max(500),
  pageLimit: z.union([
    z.literal("auto"),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  cv: z.object({
    locale: z.enum(["tr-TR", "en-US"]),
    basics: z.object({
      name: text,
      title: text,
      email: text.optional(),
      phone: text.optional(),
      location: text.optional(),
      url: text.optional(),
    }),
    summary: text.optional(),
    work: z.array(entry).max(80),
    education: z.array(entry).max(80),
    projects: z.array(entry).max(80),
    references: z.array(entry).max(80),
    skills: z.array(text).max(80),
    languages: z.array(text).max(80),
  }),
});
export type ManualDocument = z.infer<typeof manualDocumentSchema>;
