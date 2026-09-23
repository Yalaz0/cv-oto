import { describe, expect, it } from "vitest";
import { commit, createHistory, redo, undo } from "./history";

describe("editor history", () => {
  it("retains the latest fifty states", () => {
    let state = createHistory(0);
    for (let value = 1; value <= 60; value++) state = commit(state, value);
    expect(state.past).toHaveLength(50);
    expect(undo(state).present).toBe(59);
  });
  it("supports redo after undo", () => {
    const state = undo(commit(createHistory("a"), "b"));
    expect(redo(state).present).toBe("b");
  });
});
