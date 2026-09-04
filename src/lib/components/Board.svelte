<script lang="ts">
  import type { Cell } from "$lib/game/board";

  type Props = {
    size: number;
    board: Cell[][];
    given: boolean[][];
    invalid: boolean[][];
    solved: boolean;
    oncellclick: (r: number, c: number) => void;
  };

  let { size, board, given, invalid, solved, oncellclick }: Props = $props();

  // Not reactive on purpose: this is an imperative registry of DOM nodes for keyboard
  // navigation, not render state, so it doesn't need (and shouldn't trigger) reactivity.
  // oxlint-disable-next-line svelte/prefer-svelte-reactivity
  const cellEls: Record<string, HTMLButtonElement> = {};

  const focusCell = (r: number, c: number) => {
    cellEls[`${r}-${c}`]?.focus();
  };

  const focusFirstCell = () => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!given[r][c]) {
          focusCell(r, c);
          return;
        }
      }
    }
  };

  // Steps in the given direction until it lands on a focusable (non-given) cell, since a
  // given cell is `disabled` and can't receive focus. Stops at the board edge if none found.
  const moveFocus = (r: number, c: number, dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;

    while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      if (!given[nr][nc]) {
        focusCell(nr, nc);
        return;
      }

      nr += dr;
      nc += dc;
    }
  };

  // Space/Enter already toggle the focused cell for free: it's a native <button>. Only the
  // arrow keys need wiring up, to move focus between cells.
  const onCellKeydown = (event: KeyboardEvent, r: number, c: number) => {
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        moveFocus(r, c, -1, 0);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(r, c, 1, 0);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(r, c, 0, -1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveFocus(r, c, 0, 1);
        break;
    }
  };

  const NAV_KEYS = ["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

  // Before the player has focused anything (fresh page load, nothing tabbed into yet),
  // Tab or an arrow key would normally go to the first focusable element in document
  // order, the header. Redirect that very first press straight into the grid instead.
  // Never fires again afterwards: once anything has focus, activeElement isn't <body>.
  const onWindowKeydown = (event: KeyboardEvent) => {
    if (document.activeElement !== document.body || !NAV_KEYS.includes(event.key)) {
      return;
    }

    event.preventDefault();
    focusFirstCell();
  };

  $effect(() => {
    window.addEventListener("keydown", onWindowKeydown);
    return () => window.removeEventListener("keydown", onWindowKeydown);
  });
</script>

<div class="board-wrap">
  <div class="board" class:solved style="--size: {size}">
    {#each board as row, r (r)}
      {#each row as cell, c (c)}
        <button
          bind:this={cellEls[`${r}-${c}`]}
          type="button"
          class="cell"
          class:given={given[r][c]}
          class:filled={cell !== null}
          class:invalid={invalid[r][c]}
          disabled={given[r][c]}
          aria-label={`Row ${r + 1}, column ${c + 1}`}
          onclick={() => oncellclick(r, c)}
          onkeydown={(event) => onCellKeydown(event, r, c)}
        >
          {cell === null ? "" : cell}
        </button>
      {/each}
    {/each}
  </div>
</div>

<style lang="scss">
  .board-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(var(--size), 1fr);
    gap: 6px;
    width: 70%;
    height: auto;
    max-height: 100%;
    aspect-ratio: 1;
    container-type: inline-size;

    &.solved .cell {
      border-color: var(--accent);
    }
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-width: 0;
    min-height: 0;
    padding: 0;
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: white;
    font-family: var(--font-mono);
    /* Sized off the board's own rendered width (not the viewport), so a cell's
       digit scales with how many columns actually share that width. A 12x12
       cell is a third the width of a 6x6 one and needs a smaller font to match. */
    font-size: clamp(0.85rem, calc(45cqw / var(--size)), 1.75rem);
    font-weight: 600;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:not(.given) {
      &:hover {
        background-color: var(--surface-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    }

    &.filled:not(.given) {
      border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
    }

    &.given {
      background-color: color-mix(in oklab, var(--surface) 55%, white);
      color: white;
      cursor: default;
      opacity: 1;
    }

    &.invalid {
      border-color: var(--danger);
      background-color: var(--surface);
      background-image: repeating-linear-gradient(
        45deg,
        color-mix(in oklab, var(--danger) 70%, black) 0,
        color-mix(in oklab, var(--danger) 70%, black) 6px,
        transparent 6px,
        transparent 12px
      );

      &.given {
        background-color: color-mix(in oklab, var(--surface) 55%, white);
      }
    }
  }
</style>
