<script lang="ts">
  import type { Cell } from "$lib/game/board";
  import type { Theme } from "$lib/state/theme.svelte";

  type Props = {
    size: number;
    board: Cell[][];
    given: boolean[][];
    invalid: boolean[][];
    solved: boolean;
    theme: Theme;
    oncellclick: (r: number, c: number) => void;
  };

  let { size, board, given, invalid, solved, theme, oncellclick }: Props = $props();

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

{#snippet sunIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
{/snippet}

{#snippet moonIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
{/snippet}

<div class="board-wrap">
  <div class="board" class:solved class:theme-colors={theme === "colors"} style="--size: {size}">
    {#each board as row, r (r)}
      {#each row as cell, c (c)}
        <button
          bind:this={cellEls[`${r}-${c}`]}
          type="button"
          class="cell"
          class:given={given[r][c]}
          class:filled={cell !== null}
          class:invalid={invalid[r][c]}
          class:cell--zero={cell === 0}
          class:cell--one={cell === 1}
          disabled={given[r][c]}
          aria-label={`Row ${r + 1}, column ${c + 1}`}
          onclick={() => oncellclick(r, c)}
          onkeydown={(event) => onCellKeydown(event, r, c)}
        >
          {#if cell !== null && theme === "sunmoon"}
            <span class="cell__icon">{@render (cell === 1 ? sunIcon : moonIcon)()}</span>
          {:else if theme !== "colors"}
            {cell === null ? "" : cell}
          {/if}
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

  .cell__icon {
    display: inline-flex;
    width: clamp(0.9rem, calc(28cqw / var(--size)), 1.6rem);
    height: clamp(0.9rem, calc(28cqw / var(--size)), 1.6rem);

    :global(svg) {
      width: 100%;
      height: 100%;
    }
  }

  // Colors theme: the fill *is* the value, so it has to win over .given's lighter background
  // too (a given cell still needs to read as 0 or 1, not just "pre-filled"). --accent and
  // --rust-green, not --accent/--accent-secondary (too close in hue): this is the only cue,
  // so it needs the same clear separation the /daily calendar's status colors settled on.
  .theme-colors .cell.cell--zero,
  .theme-colors .cell.cell--zero.given {
    background-color: color-mix(in oklab, var(--rust-green) 55%, var(--surface));
  }

  .theme-colors .cell.cell--one,
  .theme-colors .cell.cell--one.given {
    background-color: color-mix(in oklab, var(--accent) 55%, var(--surface));
  }
</style>
