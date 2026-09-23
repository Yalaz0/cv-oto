import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-private-key",
  AI_CREDENTIAL_ENCRYPTION_KEY_V1: "a".repeat(64),
  GOOGLE_ALLOWED_MODELS: "test-model-a, test-model-b",
  GOOGLE_DEFAULT_MODEL: "test-model-a",
  PDF_RENDER_SIGNING_SECRET: "x".repeat(32),
};

describe("server environment boundary", () => {
  it("accepts a configured allowlisted model", () => {
    expect(parseServerEnv(valid).GOOGLE_DEFAULT_MODEL).toBe("test-model-a");
  });
  it("rejects an unlisted model", () => {
    expect(() =>
      parseServerEnv({ ...valid, GOOGLE_DEFAULT_MODEL: "unknown" }),
    ).toThrow("GOOGLE_DEFAULT_MODEL");
  });
  it("rejects missing configuration without exposing secret values", () => {
    const secret = "never-echo-this-secret";
    try {
      parseServerEnv({ ...valid, AI_CREDENTIAL_ENCRYPTION_KEY_V1: secret });
      expect.fail("must reject invalid key");
    } catch (error) {
      expect(String(error)).toContain("AI_CREDENTIAL_ENCRYPTION_KEY_V1");
      expect(String(error)).not.toContain(secret);
    }
  });
  it("rejects an active encryption version with no matching key", () => {
    expect(() =>
      parseServerEnv({ ...valid, AI_CREDENTIAL_ACTIVE_KEY_VERSION: "2" }),
    ).toThrow("AI_CREDENTIAL_ACTIVE_KEY_VERSION");
  });
});
