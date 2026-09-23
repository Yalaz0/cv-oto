import { expect, it } from "vitest";
import { isAllowedOrigin } from "./origin";

it("allows local aliases only in development on the same port", () => {
  expect(
    isAllowedOrigin("http://localhost:3000", "http://127.0.0.1:3000", true),
  ).toBe(true);
  expect(
    isAllowedOrigin("http://localhost:3001", "http://127.0.0.1:3000", true),
  ).toBe(false);
  expect(
    isAllowedOrigin("https://evil.test", "http://127.0.0.1:3000", true),
  ).toBe(false);
  expect(
    isAllowedOrigin("http://localhost:3000", "http://127.0.0.1:3000"),
  ).toBe(false);
  expect(isAllowedOrigin(null, "http://localhost:3000", true)).toBe(false);
});
