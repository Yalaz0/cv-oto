export type HistoryState<T> = { past: T[]; present: T; future: T[] };
export function createHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}
export function commit<T>(
  state: HistoryState<T>,
  next: T,
  limit = 50,
): HistoryState<T> {
  if (Object.is(state.present, next)) return state;
  return {
    past: [...state.past, state.present].slice(-limit),
    present: next,
    future: [],
  };
}
export function undo<T>(state: HistoryState<T>): HistoryState<T> {
  const previous = state.past.at(-1);
  return previous === undefined
    ? state
    : {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      };
}
export function redo<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0];
  return next === undefined
    ? state
    : {
        past: [...state.past, state.present].slice(-50),
        present: next,
        future: state.future.slice(1),
      };
}
