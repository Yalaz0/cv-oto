import { describe, expect, it } from "vitest";
import { authSchema, emailSchema, passwordSchema } from "./schemas";

describe("authentication schemas", () => {
  it("requires a valid email and at least eight password characters", () => {
    expect(
      authSchema.safeParse({ email: "invalid", password: "short" }).success,
    ).toBe(false);
    expect(
      authSchema.safeParse({
        email: "user@example.com",
        password: "safe-password",
      }).success,
    ).toBe(true);
  });

  it("caps sensitive inputs before they reach the provider", () => {
    expect(emailSchema.safeParse(`${"a".repeat(250)}@test.com`).success).toBe(
      false,
    );
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
