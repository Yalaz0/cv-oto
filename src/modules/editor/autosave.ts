export const AUTOSAVE_DELAY_MS = 800;
export function scheduleAutosave(
  callback: () => void,
  delay = AUTOSAVE_DELAY_MS,
) {
  return setTimeout(callback, delay);
}
