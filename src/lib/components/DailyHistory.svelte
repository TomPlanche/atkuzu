<script lang="ts">
  import { resolve } from "$app/paths";
  import { dailyIndexUrl, type DailyIndex } from "$lib/game/daily";
  import { BOARD_SIZES } from "$lib/game/board";
  import {
    type Completion,
    computeStreaks,
    groupByDay,
    mergeArchiveDays,
    readCompletions
  } from "$lib/game/completions";
  import { historyModal } from "$lib/state/history-modal.svelte";
  import { TextMorph } from "torph/svelte";

  let completions = $state<Completion[]>(readCompletions());
  // Every published day, not just ones already played, so a missed day still shows up to
  // catch up on. null until the first fetch resolves; stays whatever it last was on a failed
  // fetch (best-effort, same as the cross-device sync in DailyPuzzle.svelte).
  let archiveDates = $state<string[] | null>(null);
  let archiveLoading = $state(false);

  // Re-read on every open, not just on mount: a puzzle solved earlier in the session (or
  // just now, before this modal was ever opened) needs a fresh read of the log. The archive
  // index only needs fetching once; it's immutable except for new days appearing over time.
  $effect(() => {
    if (!historyModal.open) {
      return;
    }

    completions = readCompletions();

    if (archiveDates !== null) {
      return;
    }

    archiveLoading = true;
    fetch(dailyIndexUrl())
      .then((res) => (res.ok ? (res.json() as Promise<DailyIndex>) : { dates: [] }))
      .then((index) => {
        archiveDates = index.dates;
      })
      .catch(() => {
        // Best-effort: the local/PDS-backed day list below still works without it.
      })
      .finally(() => {
        archiveLoading = false;
      });
  });

  const stats = $derived(computeStreaks(completions));
  const days = $derived(mergeArchiveDays(groupByDay(completions), archiveDates ?? []));

  const formatTime = (total: number): string => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };
</script>

<h2 id="history-modal-title">History</h2>

<div class="stats">
  <div class="stat-tile">
    <TextMorph class="stat-tile__value" text={String(stats.currentStreak)} />
    <span class="stat-tile__label">Current streak</span>
  </div>
  <div class="stat-tile">
    <TextMorph class="stat-tile__value" text={String(stats.maxStreak)} />
    <span class="stat-tile__label">Max streak</span>
  </div>
  <div class="stat-tile">
    <TextMorph class="stat-tile__value" text={String(stats.gamesPlayed)} />
    <span class="stat-tile__label">Puzzles solved</span>
  </div>
</div>

{#if archiveLoading && days.length === 0}
  <p class="empty">Loading…</p>
{:else if days.length === 0}
  <p class="empty">No completions yet. Solve today's daily to start a streak.</p>
{:else}
  <ul class="days">
    {#each days as day (day.date)}
      <li class="day">
        <a
          class="day__date"
          href={resolve("/daily/[date]", { date: day.date })}
          onclick={() => historyModal.hide()}
        >
          {day.date}
          <TextMorph class="day__num" text={`#${day.puzzleNumber}`} />
        </a>
        <div class="day__sizes">
          {#each BOARD_SIZES as size (size)}
            {@const completion = day.sizes[size]}
            <div class="size-badge" class:solved={!!completion}>
              <span class="size-badge__label">{size}×{size}</span>
              {#if completion}
                <span class="size-badge__meta">
                  {formatTime(completion.durationSeconds)} · {completion.toggleCount}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style lang="scss">
  h2 {
    margin-block-end: var(--space-4);
  }

  .stats {
    display: flex;
    gap: var(--space-2);
    margin-block-end: var(--space-6);
  }

  .stat-tile {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);

    &__label {
      font-size: 0.75rem;
      color: var(--muted);
      text-align: center;
    }
  }

  .stat-tile :global(.stat-tile__value) {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--fg);
  }

  .empty {
    margin: 0;
    color: var(--muted);
  }

  .days {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .day {
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);

    &__date {
      margin-block-end: var(--space-2);
      font-size: 0.875rem;
      color: var(--fg);
    }

    &__sizes {
      display: flex;
      gap: var(--space-2);
    }
  }

  .day :global(.day__num) {
    color: var(--muted);
    font-weight: 400;
  }

  .size-badge {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    opacity: 0.4;

    &.solved {
      opacity: 1;
      border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
    }

    &__label {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--fg);
    }

    &__meta {
      font-size: 0.7rem;
      color: var(--muted);
    }
  }
</style>
