import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./crypto.server";

const key = "a".repeat(64);
describe("credential encryption", () => {
  it("round trips AES-256-GCM without retaining plaintext", () => {
    const encrypted = encryptCredential("AIza-example-secret", key);
    expect(encrypted.ciphertext).not.toContain("AIza");
    expect(decryptCredential(encrypted, key)).toBe("AIza-example-secret");
  });
  it("rejects tampered ciphertext", () => {
    const encrypted = encryptCredential("secret", key);
    expect(() =>
      decryptCredential({ ...encrypted, authTag: "AAAA" }, key),
    ).toThrow();
  });
});
