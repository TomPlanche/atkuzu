<script lang="ts">
  import { DAILY_SIZES } from "$lib/game/daily";
  import {
    type Completion,
    computeStreaks,
    groupByDay,
    readCompletions
  } from "$lib/game/completions";
  import { historyModal } from "$lib/state/history-modal.svelte";

  let completions = $state<Completion[]>(readCompletions());

  // Re-read on every open, not just on mount: a puzzle solved earlier in the session (or
  // just now, before this modal was ever opened) needs a fresh read of the log.
  $effect(() => {
    if (historyModal.open) {
      completions = readCompletions();
    }
  });

  const stats = $derived(computeStreaks(completions));
  const days = $derived(groupByDay(completions));

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
    <span class="stat-tile__value">{stats.currentStreak}</span>
    <span class="stat-tile__label">Current streak</span>
  </div>
  <div class="stat-tile">
    <span class="stat-tile__value">{stats.maxStreak}</span>
    <span class="stat-tile__label">Max streak</span>
  </div>
  <div class="stat-tile">
    <span class="stat-tile__value">{stats.gamesPlayed}</span>
    <span class="stat-tile__label">Puzzles solved</span>
  </div>
</div>

{#if days.length === 0}
  <p class="empty">No completions yet. Solve today's daily to start a streak.</p>
{:else}
  <ul class="days">
    {#each days as day (day.date)}
      <li class="day">
        <div class="day__date">{day.date} <span class="day__num">#{day.puzzleNumber}</span></div>
        <div class="day__sizes">
          {#each DAILY_SIZES as size (size)}
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

    &__value {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--fg);
    }

    &__label {
      font-size: 0.75rem;
      color: var(--muted);
      text-align: center;
    }
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

    &__num {
      color: var(--muted);
      font-weight: 400;
    }

    &__sizes {
      display: flex;
      gap: var(--space-2);
    }
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
