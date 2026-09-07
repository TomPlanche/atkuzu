<script lang="ts">
  type MiniCell = { value: 0 | 1; invalid?: boolean };

  // Static illustrations, one per rule below, mirroring $lib/game/board.ts's computeInvalid:
  // a triple marks the three offending cells, an unbalanced line marks only the overflowing
  // value's cells, a duplicate line marks the whole line.
  const tripleExample: MiniCell[] = [
    { value: 0 },
    { value: 1, invalid: true },
    { value: 1, invalid: true },
    { value: 1, invalid: true },
    { value: 0 },
    { value: 0 }
  ];

  const balanceExample: MiniCell[] = [
    { value: 1, invalid: true },
    { value: 1, invalid: true },
    { value: 0 },
    { value: 1, invalid: true },
    { value: 0 },
    { value: 1, invalid: true }
  ];

  const duplicateExample: MiniCell[][] = [
    [
      { value: 1, invalid: true },
      { value: 0, invalid: true },
      { value: 1, invalid: true },
      { value: 0, invalid: true }
    ],
    [
      { value: 1, invalid: true },
      { value: 0, invalid: true },
      { value: 1, invalid: true },
      { value: 0, invalid: true }
    ]
  ];
</script>

{#snippet strip(cells: MiniCell[])}
  <div class="mini-strip">
    {#each cells as cell, i (i)}
      <span class="mini-cell" class:invalid={cell.invalid}>{cell.value}</span>
    {/each}
  </div>
{/snippet}

<h2 id="rules-modal-title">How to play</h2>

<p class="intro">
  Fill the grid with <strong>0</strong>s and <strong>1</strong>s so that every row and column
  follows these rules:
</p>

<ul class="rules">
  <li>
    <strong>No three in a row.</strong> The same digit can't appear three times in a row, in either
    direction.
    {@render strip(tripleExample)}
  </li>
  <li>
    <strong>Balanced rows and columns.</strong> Each row and column has the same number of 0s and
    1s.
    {@render strip(balanceExample)}
  </li>
  <li>
    <strong>No duplicate lines.</strong> No two rows are identical, and no two columns are
    identical.
    <div class="mini-stack">
      {@render strip(duplicateExample[0])}
      {@render strip(duplicateExample[1])}
    </div>
  </li>
</ul>

<p class="hint">
  A cell that breaks a rule turns red as soon as you place it, so you always know where to look.
</p>

<h3>Controls</h3>

<ul class="controls">
  <li><kbd>Click</kbd> or <kbd>Space</kbd> cycles a cell through blank, 0, and 1.</li>
  <li>
    <kbd>&larr;</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd> <kbd>&rarr;</kbd> move focus between cells.
  </li>
  <li><kbd>Enter</kbd> submits the puzzle once it's full.</li>
  <li>
    <kbd>Ctrl</kbd>+<kbd>Z</kbd> (<kbd>Cmd</kbd>+<kbd>Z</kbd> on Mac) undoes a move, <br />
    <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> redoes it. <br />
    Or use the Undo/Redo buttons above the board.
  </li>
</ul>

<style lang="scss">
  h2 {
    margin-block-end: var(--space-4);
  }

  h3 {
    margin-block: var(--space-6) var(--space-3);
    font-size: 0.95rem;
    color: var(--fg);
  }

  .intro {
    margin: 0;
    color: var(--muted);
  }

  .rules,
  .controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin: var(--space-4) 0 0;
    padding: 0;
    list-style: none;
  }

  .rules li {
    padding-inline-start: var(--space-4);
    border-inline-start: 2px solid var(--border);
    color: var(--muted);

    strong {
      color: var(--fg);
    }
  }

  .controls li {
    color: var(--muted);
  }

  .hint {
    margin: var(--space-4) 0 0;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .mini-strip {
    display: flex;
    gap: 4px;
    margin-block-start: var(--space-2);
  }

  .mini-stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-block-start: var(--space-2);
  }

  .mini-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background-color: var(--surface);
    color: white;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;

    &.invalid {
      border-color: var(--danger);
      background-color: var(--surface);
      background-image: repeating-linear-gradient(
        45deg,
        color-mix(in oklab, var(--danger) 70%, black) 0,
        color-mix(in oklab, var(--danger) 70%, black) 4px,
        transparent 4px,
        transparent 8px
      );
    }
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5em;
    padding: 0.1em 0.4em;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 0.8em;
    color: var(--fg);
  }
</style>
