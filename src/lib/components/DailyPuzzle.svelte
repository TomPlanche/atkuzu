<script lang="ts">
  import { type DailyFile, type DailyPuzzle, puzzleNumber } from "$lib/game/daily";
  import {
    BOARD_SIZES,
    type BoardSize,
    type Cell,
    chunkRows,
    cloneGrid,
    computeInvalid,
    encodeGrid,
    parseGrid
  } from "$lib/game/board";
  import { sha256Hex } from "$lib/game/hash";
  import { createMoveHistory, type MoveHistory } from "$lib/game/history.svelte";
  import { isRedoCombo, isUndoCombo } from "$lib/game/keys";
  import { recordCompletion } from "$lib/game/completions";
  import { pdslsRecordUrl } from "$lib/pdsls";
  import { historyModal } from "$lib/state/history-modal.svelte";
  import { calendarModal } from "$lib/state/calendar-modal.svelte";
  import { TextMorph } from "torph/svelte";
  import toast from "svelte-french-toast";
  import { toastErrorOptions, toastLoadingOptions, toastSuccessOptions } from "$lib/toast";
  import Board from "$lib/components/Board.svelte";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import DailyHistory from "$lib/components/DailyHistory.svelte";
  import DailyCalendar from "$lib/components/DailyCalendar.svelte";

  type Props = {
    date: string;
    daily: DailyFile | null;
    session: App.Session | null;
  };

  let { date, daily, session }: Props = $props();

  type SizeEntry = {
    puzzle: DailyPuzzle | undefined;
    initial: Cell[][];
    given: boolean[][];
  };

  const entries: Record<BoardSize, SizeEntry> = Object.fromEntries(
    BOARD_SIZES.map((size) => {
      const puzzle = daily?.puzzles.find((p) => p.size === size);
      const initial = puzzle ? parseGrid(chunkRows(puzzle.puzzle, size)) : [];
      const given = initial.map((row) => row.map((c) => c !== null));

      return [size, { puzzle, initial, given }];
    })
  ) as Record<BoardSize, SizeEntry>;

  const storageKey = (size: BoardSize) => `atkuzu:daily:${date}:${size}`;

  const readStoredBoard = (size: BoardSize): Cell[][] | null => {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const raw = localStorage.getItem(storageKey(size));
      if (!raw) {
        return null;
      }

      const stored = JSON.parse(raw) as Cell[][];
      return stored.length === entries[size].initial.length ? stored : null;
    } catch {
      return null;
    }
  };

  const boardFor = (size: BoardSize): Cell[][] => {
    const entry = entries[size];
    if (!entry.puzzle) {
      return [];
    }

    return readStoredBoard(size) ?? cloneGrid(entry.initial);
  };

  type Progress = { toggleCount: number; elapsedSeconds: number };

  const progressKey = (size: BoardSize) => `atkuzu:daily:${date}:${size}:progress`;

  const progressFor = (size: BoardSize): Progress => {
    try {
      const raw = localStorage.getItem(progressKey(size));

      return raw ? (JSON.parse(raw) as Progress) : { toggleCount: 0, elapsedSeconds: 0 };
    } catch {
      return { toggleCount: 0, elapsedSeconds: 0 };
    }
  };

  const rkeyStorageKey = (size: BoardSize) => `atkuzu:daily:${date}:${size}:rkey`;

  const rkeyFor = (size: BoardSize): string | null => {
    try {
      return localStorage.getItem(rkeyStorageKey(size));
    } catch {
      return null;
    }
  };

  // One undo/redo stack per size: session-only, like the timer/toggle count is not, so
  // switching tabs (or reloading) starts that size's history fresh.
  const histories: Record<BoardSize, MoveHistory> = Object.fromEntries(
    BOARD_SIZES.map((size) => [size, createMoveHistory()])
  ) as Record<BoardSize, MoveHistory>;

  const defaultSize: BoardSize = 6;
  const initialProgress = progressFor(defaultSize);

  let selectedSize = $state<BoardSize>(defaultSize);
  let board = $state<Cell[][]>(boardFor(defaultSize));
  let toggleCount = $state(initialProgress.toggleCount);
  let elapsedSeconds = $state(initialProgress.elapsedSeconds);
  let isSolved = $state(false);
  // True per size once /daily/status finds an existing PDS record for it: solved elsewhere
  // already (another device, or a prior session on this one). The client never holds the
  // solution, so this can't make the grid itself look filled in, only stop play and show the
  // banner (see `solved` below).
  let completedElsewhere = $state<Record<BoardSize, boolean>>({ 6: false, 8: false, 12: false });
  // Set once we know this puzzle's PDS record key, either from a fresh /daily/complete
  // response, restored from localStorage, or found by /daily/status. Null until then (not
  // logged in, not yet sent, or solved before this link existed), in which case the banner
  // just skips the link.
  let recordRkey = $state<string | null>(rkeyFor(defaultSize));
  // Deliberately a plain Set, not SvelteSet: the effect below both reads and mutates it,
  // and a reactive Set would re-trigger that same effect on every add()/delete(), which
  // turned a single failed submit into an instant infinite retry loop.
  // oxlint-disable-next-line svelte/prefer-svelte-reactivity
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const recording = new Set<BoardSize>();

  const selectSize = (size: BoardSize) => {
    selectedSize = size;
    board = boardFor(size);
    const progress = progressFor(size);
    toggleCount = progress.toggleCount;
    elapsedSeconds = progress.elapsedSeconds;
    recordRkey = rkeyFor(size);
  };

  const given = $derived(entries[selectedSize].given);
  const isFull = $derived(board.length > 0 && board.every((row) => row.every((c) => c !== null)));
  const recordUrl = $derived(
    session && recordRkey
      ? pdslsRecordUrl(session.did, "com.tomplanche.atkuzu.result", recordRkey)
      : null
  );
  const invalid = $derived(board.length > 0 ? computeInvalid(board, selectedSize) : []);
  const isRuleValid = $derived(invalid.every((row) => row.every((v) => !v)));
  // Solved on this device (isSolved) or found already solved elsewhere: either way, play
  // stops and the banner shows.
  const solved = $derived(isSolved || completedElsewhere[selectedSize]);

  const cycleCell = (r: number, c: number) => {
    if (given[r][c] || solved) {
      return;
    }

    const prev = board[r][c];
    const next = prev === null ? 0 : prev === 0 ? 1 : null;
    board[r][c] = next;
    toggleCount += 1;
    histories[selectedSize].push({ r, c, prev, next });
  };

  const undo = () => {
    const move = histories[selectedSize].undo();
    if (!move) {
      return;
    }

    board[move.r][move.c] = move.prev;
    toggleCount = Math.max(0, toggleCount - 1);
  };

  const redo = () => {
    const move = histories[selectedSize].redo();
    if (!move) {
      return;
    }

    board[move.r][move.c] = move.next;
    toggleCount += 1;
  };

  const resetBoard = () => {
    board = cloneGrid(entries[selectedSize].initial);
    toggleCount = 0;
    elapsedSeconds = 0;
    histories[selectedSize].clear();
  };

  const formatTime = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };

  const recordedKey = (d: string, size: BoardSize) => `atkuzu:daily:${d}:${size}:recorded`;

  $effect(() => {
    const entry = entries[selectedSize];
    if (!entry.puzzle) {
      return;
    }

    try {
      localStorage.setItem(storageKey(selectedSize), JSON.stringify(board));
    } catch {
      // localStorage unavailable (private mode, quota), so progress just won't persist.
    }
  });

  // Mirrors the board-persist effect above: without this, elapsedSeconds/toggleCount reset
  // to 0 on every remount (e.g. navigating away and back, or logging back in later), even
  // though the board itself was restored already-solved.
  $effect(() => {
    const entry = entries[selectedSize];
    if (!entry.puzzle) {
      return;
    }

    try {
      localStorage.setItem(
        progressKey(selectedSize),
        JSON.stringify({ toggleCount, elapsedSeconds })
      );
    } catch {
      // localStorage unavailable; the timer/toggle count just won't survive a reload.
    }
  });

  $effect(() => {
    const puzzle = entries[selectedSize].puzzle;
    if (!puzzle || !isFull || !isRuleValid) {
      isSolved = false;
      return;
    }

    let cancelled = false;
    sha256Hex(encodeGrid(board)).then((hash) => {
      if (!cancelled) {
        isSolved = hash === puzzle.solutionSha256;
      }
    });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (solved) {
      return;
    }

    const timer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);

    return () => clearInterval(timer);
  });

  $effect(() => {
    const size = selectedSize;
    const d = date;

    if (!isSolved || !session || recording.has(size)) {
      return;
    }

    try {
      if (localStorage.getItem(recordedKey(d, size)) === "1") {
        return;
      }
    } catch {
      // localStorage unavailable; fall through and let the PDS's write-once guard protect us.
    }

    recording.add(size);

    const attempt = fetch("/daily/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: d,
        size,
        board: encodeGrid(board),
        durationSeconds: elapsedSeconds,
        toggleCount
      })
    })
      .then((res) => res.json())
      .then(
        (result: {
          recorded: boolean;
          reason?: string;
          alreadyRecorded?: boolean;
          rkey?: string;
        }) => {
          if (!result.recorded) {
            throw new Error(result.reason ?? "unknown error");
          }

          try {
            localStorage.setItem(recordedKey(d, size), "1");
            if (result.rkey) {
              localStorage.setItem(rkeyStorageKey(size), result.rkey);
            }
          } catch {
            // localStorage unavailable; the PDS's write-once guard still protects a retry.
          }

          if (result.rkey && size === selectedSize) {
            recordRkey = result.rkey;
          }

          return result;
        }
      );

    toast.promise(
      attempt,
      {
        loading: "Saving your result to your PDS…",
        success: (result) =>
          result.alreadyRecorded
            ? "This puzzle was already recorded."
            : "Result saved to your PDS.",
        error: "Couldn't save your result to your PDS."
      },
      {
        success: toastSuccessOptions,
        error: toastErrorOptions,
        loading: toastLoadingOptions
      }
    );

    attempt
      .catch(() => {
        // Already surfaced via the toast above, never block the solved banner over this.
      })
      .finally(() => {
        recording.delete(size);
      });
  });

  // Local history, independent of login: every solve lands in $lib/game/completions'
  // localStorage log, whether or not it also made it to the PDS above. completedAt is the
  // real completion time, not the puzzle's own date, so a catch-up on a past day is tracked
  // as such and correctly left out of the streak (see completions.ts's computeStreaks).
  $effect(() => {
    if (!isSolved) {
      return;
    }

    recordCompletion({
      date,
      size: selectedSize,
      puzzleNumber: puzzleNumber(date),
      durationSeconds: elapsedSeconds,
      toggleCount,
      completedAt: new Date().toISOString()
    });
  });

  // Cross-device sync: on login (or any fresh load while logged in), check the player's own
  // PDS for a result already recorded for this date, e.g. from solving on another device, so
  // it shows as solved here too instead of asking them to solve it again.
  $effect(() => {
    const d = date;
    if (!session) {
      return;
    }

    let cancelled = false;

    fetch(`/daily/status?date=${d}`)
      .then((res) => (res.ok ? res.json() : { results: {} }))
      .then(
        (result: {
          results: Partial<
            Record<
              BoardSize,
              { rkey: string; durationSeconds: number; toggleCount: number; createdAt: string }
            >
          >;
        }) => {
          if (cancelled) {
            return;
          }

          for (const size of BOARD_SIZES) {
            const entry = result.results[size];
            if (!entry) {
              continue;
            }

            completedElsewhere[size] = true;

            try {
              localStorage.setItem(recordedKey(d, size), "1");
              localStorage.setItem(rkeyStorageKey(size), entry.rkey);
              localStorage.setItem(
                progressKey(size),
                JSON.stringify({
                  toggleCount: entry.toggleCount,
                  elapsedSeconds: entry.durationSeconds
                })
              );
            } catch {
              // localStorage unavailable; the live state below still reflects it for this session.
            }

            recordCompletion({
              date: d,
              size,
              puzzleNumber: puzzleNumber(d),
              durationSeconds: entry.durationSeconds,
              toggleCount: entry.toggleCount,
              completedAt: entry.createdAt
            });

            if (size === selectedSize) {
              recordRkey = entry.rkey;
              toggleCount = entry.toggleCount;
              elapsedSeconds = entry.durationSeconds;
            }
          }
        }
      )
      .catch(() => {
        // Best-effort sync; solving locally still works if this fails.
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (isUndoCombo(event)) {
        event.preventDefault();
        undo();
      } else if (isRedoCombo(event)) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

{#snippet calendarIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
{/snippet}

{#snippet resetIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
{/snippet}

{#snippet undoIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
{/snippet}

{#snippet redoIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 14 5-5-5-5" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
{/snippet}

<section class="daily">
  <div class="daily__bar">
    <h1 class="daily__title">
      Daily
      <button
        aria-haspopup="dialog"
        class="daily__date"
        onclick={() => calendarModal.show()}
        type="button"
      >
        {date}
        <span class="daily__date-icon">{@render calendarIcon()}</span>
      </button>
    </h1>

    <div class="daily__bar-right">
      {#if daily}
        <div class="daily__tabs" role="tablist" aria-label="Puzzle size">
          {#each BOARD_SIZES as size (size)}
            <button
              type="button"
              role="tab"
              class="tab"
              class:active={selectedSize === size}
              aria-selected={selectedSize === size}
              onclick={() => selectSize(size)}
            >
              {size}×{size}
            </button>
          {/each}
        </div>
      {/if}
      <button class="history-btn" onclick={() => historyModal.show()} type="button">History</button>
    </div>
  </div>

  {#if !daily}
    <p class="notice">This day's puzzles aren't published yet. Check back soon.</p>
  {:else if !entries[selectedSize].puzzle}
    <p class="notice">
      The {selectedSize}×{selectedSize} puzzle isn't published for this day.
    </p>
  {:else}
    <div class="daily__actions">
      <div class="daily__stats">
        <span class="stat">Time <TextMorph as="strong" text={formatTime(elapsedSeconds)} /></span>
        <span class="stat">Toggles <TextMorph as="strong" text={String(toggleCount)} /></span>
      </div>
      <div class="daily__buttons">
        <Button
          disabled={!histories[selectedSize].canUndo}
          icon={undoIcon}
          onclick={undo}
          type="button"
          variant="secondary"
        >
          Undo
        </Button>
        <Button
          disabled={!histories[selectedSize].canRedo}
          icon={redoIcon}
          onclick={redo}
          type="button"
          variant="secondary"
        >
          Redo
        </Button>
        <Button type="button" icon={resetIcon} variant="secondary" letter="r" onclick={resetBoard}>
          Reset
        </Button>
      </div>
    </div>

    <Board size={selectedSize} {board} {given} {invalid} {solved} oncellclick={cycleCell} />

    <p aria-hidden={!solved} class="solved-banner" class:visible={solved}>
      <span class="solved-banner__pill">
        {#if isSolved}
          Solved this {selectedSize}×{selectedSize}.
        {:else}
          Already solved this {selectedSize}×{selectedSize}.
        {/if}
        {#if recordUrl}
          <!-- recordUrl is always an absolute https://pdsls.dev/... URL, built in pdslsUrl() above -->
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          &nbsp;<a href={recordUrl} target="_blank" rel="noopener noreferrer">View record</a>
        {/if}
      </span>
    </p>
  {/if}
</section>

<Modal bind:open={historyModal.open} labelledby="history-modal-title">
  <DailyHistory />
</Modal>

<Modal bind:open={calendarModal.open} compact labelledby="calendar-modal-title">
  <DailyCalendar {date} />
</Modal>

<style lang="scss">
  .daily {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding-block: var(--space-8);

    &__bar {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-block-end: var(--space-6);
      flex-wrap: wrap;

      .daily__title {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
        font-size: 1.1rem;
        font-weight: 700;
        // Overrides the global hero-style gradient heading (src/lib/styles/_base.scss):
        // that treatment fits the homepage's big title, not a compact page label.
        background: none;
        -webkit-background-clip: initial;
        background-clip: initial;
        color: var(--fg);
      }
    }

    &__date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: none;
      background: none;
      padding: 0;
      font: inherit;
      font-size: 0.85em;
      color: var(--muted);
      font-weight: 400;
      cursor: pointer;

      &:hover {
        color: var(--fg);
      }
    }

    &__date-icon {
      display: inline-flex;
      width: 0.9em;
      height: 0.9em;
      color: var(--muted);

      svg {
        width: 100%;
        height: 100%;
      }
    }

    &__bar-right {
      display: flex;
      align-items: center;
      gap: var(--space-6);
    }

    &__tabs {
      display: flex;
      gap: var(--space-2);
    }

    &__actions {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      margin-block-end: var(--space-6);
      font-size: 0.9rem;
      color: var(--muted);
    }

    &__stats {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    &__buttons {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  }

  .stat :global(strong) {
    color: white;
    font-family: var(--font-mono);
  }

  .history-btn {
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: 0.9rem;
    color: var(--muted);
    cursor: pointer;

    &:hover {
      color: var(--fg);
    }
  }

  .tab {
    padding: 0.4em 0.9em;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
    }

    &.active {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-contrast);
    }
  }

  .notice {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
  }

  .solved-banner {
    flex-shrink: 0;
    margin-block-start: var(--space-6);
    text-align: center;
    visibility: hidden;

    &.visible {
      visibility: visible;
    }

    &__pill {
      display: inline-flex;
      padding: 0.4em 1em;
      border-radius: var(--radius-sm);
      background: color-mix(in oklab, var(--accent) 16%, transparent);
      color: var(--fg);
      font-weight: 600;
    }
  }
</style>
