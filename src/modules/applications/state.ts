export const applicationStates = [
  "draft",
  "analyzing",
  "analyzed",
  "generating",
  "review_required",
  "ready_to_export",
  "exported",
  "failed",
] as const;
export type ApplicationState = (typeof applicationStates)[number];
export type StableState = Exclude<
  ApplicationState,
  "analyzing" | "generating" | "failed"
>;

const transitions: Record<ApplicationState, readonly ApplicationState[]> = {
  draft: ["analyzing"],
  analyzing: ["analyzed", "failed"],
  analyzed: ["analyzing", "generating"],
  generating: ["review_required", "failed"],
  review_required: ["generating", "ready_to_export"],
  ready_to_export: ["review_required", "generating", "exported"],
  exported: ["review_required", "generating", "ready_to_export"],
  failed: [],
};

export function transition(
  current: ApplicationState,
  next: ApplicationState,
  previousStable?: StableState,
): ApplicationState {
  if (current === "failed" && previousStable && next === previousStable)
    return next;
  if (!transitions[current].includes(next))
    throw new Error("INVALID_STATE_TRANSITION");
  return next;
}
