import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = publicSchema
  .extend({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    AI_CREDENTIAL_ENCRYPTION_KEY_V1: z.string().regex(/^[a-fA-F0-9]{64}$/),
    AI_CREDENTIAL_ACTIVE_KEY_VERSION: z.coerce
      .number()
      .int()
      .positive()
      .default(1),
    GOOGLE_ALLOWED_MODELS: z.string().min(1),
    GOOGLE_DEFAULT_MODEL: z.string().min(1),
    PDF_RENDER_SIGNING_SECRET: z.string().min(32),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((env, ctx) => {
    if (
      !env.GOOGLE_ALLOWED_MODELS.split(",")
        .map((id) => id.trim())
        .includes(env.GOOGLE_DEFAULT_MODEL)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_DEFAULT_MODEL"],
        message: "Default model must be allowlisted",
      });
    }
    if (env.AI_CREDENTIAL_ACTIVE_KEY_VERSION !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_CREDENTIAL_ACTIVE_KEY_VERSION"],
        message: "No key configured for this version",
      });
    }
  });

// Never include values or Zod input data in configuration errors.
export function parseServerEnv(input: Record<string, string | undefined>) {
  const result = serverSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Invalid environment: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`,
    );
  }
  return result.data;
}

export function parsePublicEnv(input: Record<string, string | undefined>) {
  const result = publicSchema.safeParse(input);
  if (!result.success)
    throw new Error("Supabase public configuration is missing or invalid.");
  return result.data;
}
