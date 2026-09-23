import { describe, expect, it, vi } from "vitest";
import { AUTOSAVE_DELAY_MS, scheduleAutosave } from "./autosave";

describe("autosave", () => {
  it("waits 800ms", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    scheduleAutosave(callback);
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
