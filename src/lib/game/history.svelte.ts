import type { Cell } from "$lib/game/board";

export type CellMove = { r: number; c: number; prev: Cell; next: Cell };

export type MoveHistory = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  push: (move: CellMove) => void;
  undo: () => CellMove | null;
  redo: () => CellMove | null;
  clear: () => void;
};

/**
 * Per-board undo/redo stack of single-cell moves. Session-only, not persisted: a page
 * reload starts fresh, same as the daily's per-size progress does not carry a history.
 */
export const createMoveHistory = (): MoveHistory => {
  const undoStack = $state<CellMove[]>([]);
  const redoStack = $state<CellMove[]>([]);

  return {
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    push(move: CellMove) {
      undoStack.push(move);
      redoStack.length = 0;
    },
    undo() {
      const move = undoStack.pop();
      if (!move) {
        return null;
      }

      redoStack.push(move);
      return move;
    },
    redo() {
      const move = redoStack.pop();
      if (!move) {
        return null;
      }

      undoStack.push(move);
      return move;
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    }
  };
};
