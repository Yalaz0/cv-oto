import { describe, expect, it } from "vitest";
import { transition } from "./state";

describe("application transitions", () => {
  it("requires analysis before generation", () => {
    expect(() => transition("draft", "generating")).toThrow();
  });
  it("permits the supported review and export flow", () => {
    expect(transition("generating", "review_required")).toBe("review_required");
    expect(transition("review_required", "ready_to_export")).toBe(
      "ready_to_export",
    );
    expect(transition("ready_to_export", "exported")).toBe("exported");
  });
  it("restores only the recorded stable state after failure", () => {
    expect(transition("failed", "analyzed", "analyzed")).toBe("analyzed");
    expect(() => transition("failed", "exported", "analyzed")).toThrow();
    expect(() => transition("failed", "analyzed")).toThrow();
  });
});
