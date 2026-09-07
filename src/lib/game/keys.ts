/**
 * Ctrl+Z (Cmd+Z on macOS) for undo, Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y for redo.
 *
 * Matches on `event.key`, not `event.code`: `.key` is the character the OS's active
 * keyboard layout actually produces, so this lands on the right physical key on AZERTY,
 * QWERTZ, etc. the same way undo already works in every other app on the user's system.
 * `.code` reports a fixed QWERTY position instead, which would put undo on the wrong key
 * for anyone not on QWERTY.
 */
export const isUndoCombo = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) &&
  !event.shiftKey &&
  !event.altKey &&
  event.key.toLowerCase() === "z";

export const isRedoCombo = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  ((event.key.toLowerCase() === "z" && event.shiftKey) ||
    (event.key.toLowerCase() === "y" && !event.shiftKey));
