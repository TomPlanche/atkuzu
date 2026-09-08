<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Calendar } from "bits-ui";
  import { type DateValue, parseDate } from "@internationalized/date";
  import {
    DAILY_SIZES,
    type DailyIndex,
    dailyIndexUrl,
    type DailySize,
    todayUtcDate
  } from "$lib/game/daily";
  import { type Completion, readCompletions } from "$lib/game/completions";
  import { calendarModal } from "$lib/state/calendar-modal.svelte";

  type Props = {
    /** The day currently being played/viewed, to seed the starting month and mark it. */
    date: string;
  };

  let { date }: Props = $props();

  const today = todayUtcDate();
  const maxValue = parseDate(today);

  /** `DateValue` is zoneless, so this is exactly the `YYYY-MM-DD` our own dates use. */
  const isoOf = (d: DateValue): string =>
    `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

  let completions = $state<Completion[]>(readCompletions());
  let archiveDates = $state<string[] | null>(null);
  let archiveLoading = $state(false);
  // Seeded from `today`, not the `date` prop, since Calendar.Root mounts (via Modal.svelte,
  // which always renders its children) before the modal is ever opened; the $effect below
  // resets it to `date`'s month every time the modal actually opens.
  let placeholder = $state<DateValue>(parseDate(today));
  let value = $state<DateValue | undefined>(undefined);

  const solvedByDate = $derived.by(() => {
    // Built fresh from `completions` on every recompute and only ever read (.get/.has) by
    // callers afterward, never mutated externally, so plain Map/Set (not the reactive
    // Svelte*  variants, which only matter for mutations after the fact) is correct here.
    // oxlint-disable-next-line svelte/prefer-svelte-reactivity
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const map = new Map<string, Set<DailySize>>();

    for (const completion of completions) {
      // oxlint-disable-next-line svelte/prefer-svelte-reactivity
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const sizes = map.get(completion.date) ?? new Set<DailySize>();
      sizes.add(completion.size);
      map.set(completion.date, sizes);
    }

    return map;
  });

  const archiveSet = $derived(new Set(archiveDates ?? []));
  const minValue = $derived.by(() => {
    if (!archiveDates || archiveDates.length === 0) {
      return undefined;
    }

    return parseDate(archiveDates.toSorted()[0]);
  });

  type CellStatus = "unsolved" | "partial" | "solved";

  const statusFor = (iso: string): CellStatus => {
    const solvedCount = solvedByDate.get(iso)?.size ?? 0;
    if (solvedCount === 0) {
      return "unsolved";
    }
    return solvedCount < DAILY_SIZES.length ? "partial" : "solved";
  };

  const dayClass = (iso: string): string => {
    const current = iso === date ? " cell__day--current" : "";

    return `cell__day cell__day--${statusFor(iso)}${current}`;
  };

  // A day is playable only if it's a published archive date (any gap, e.g. one removed by
  // hand, is excluded too); minValue/maxValue already keep navigation within that range, but
  // isDateDisabled is what actually blocks a specific day inside it.
  const isDateDisabled = (d: DateValue): boolean => !archiveSet.has(isoOf(d));

  // Selecting a day (click or keyboard) navigates there and closes the modal, rather than
  // holding a persistent selection: this calendar is a jump-to-day picker, not a form field.
  $effect(() => {
    if (!value) {
      return;
    }

    const iso = isoOf(value);
    value = undefined;
    calendarModal.hide();
    goto(resolve("/daily/[date]", { date: iso }));
  });

  $effect(() => {
    if (!calendarModal.open) {
      return;
    }

    completions = readCompletions();
    placeholder = parseDate(date);

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
        // Best-effort: past days just show as unavailable rather than not rendering at all.
      })
      .finally(() => {
        archiveLoading = false;
      });
  });
</script>

{#snippet chevronLeft()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
{/snippet}

{#snippet chevronRight()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
{/snippet}

<h2 id="calendar-modal-title">Calendar</h2>

<Calendar.Root
  bind:placeholder
  bind:value
  class="calendar"
  fixedWeeks={true}
  {isDateDisabled}
  {maxValue}
  {minValue}
  type="single"
  weekdayFormat="short"
>
  {#snippet children({ months, weekdays })}
    <div class="calendar__header">
      <Calendar.PrevButton class="calendar__nav">{@render chevronLeft()}</Calendar.PrevButton>
      <Calendar.Heading class="calendar__month" />
      <Calendar.NextButton class="calendar__nav">{@render chevronRight()}</Calendar.NextButton>
    </div>

    {#each months as month (month.value.toString())}
      <Calendar.Grid class="calendar__grid">
        <Calendar.GridHead>
          <Calendar.GridRow class="calendar__weekdays">
            {#each weekdays as day (day)}
              <Calendar.HeadCell class="calendar__headcell">{day.slice(0, 2)}</Calendar.HeadCell>
            {/each}
          </Calendar.GridRow>
        </Calendar.GridHead>
        <Calendar.GridBody>
          {#each month.weeks as weekDates, i (i)}
            <Calendar.GridRow class="calendar__week">
              {#each weekDates as day (day.toString())}
                {@const iso = isoOf(day)}
                <Calendar.Cell date={day} month={month.value} class="cell">
                  <Calendar.Day class={dayClass(iso)} />
                </Calendar.Cell>
              {/each}
            </Calendar.GridRow>
          {/each}
        </Calendar.GridBody>
      </Calendar.Grid>
    {/each}
  {/snippet}
</Calendar.Root>

{#if archiveLoading}
  <p class="calendar__status">Loading…</p>
{/if}

<div class="calendar__legend">
  <span class="legend-item"><i class="dot dot--solved"></i>Solved</span>
  <span class="legend-item"><i class="dot dot--partial"></i>Partial</span>
  <span class="legend-item"><i class="dot dot--unsolved"></i>Not solved</span>
</div>

<style lang="scss">
  h2 {
    margin-block-end: var(--space-4);
  }

  :global(.calendar) {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  :global(.calendar__header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  :global(.calendar__month) {
    font-weight: 600;
    color: var(--fg);
  }

  :global(.calendar__nav) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;

    :global(svg) {
      width: 1rem;
      height: 1rem;
    }

    &:hover:not([data-disabled]):not(:disabled) {
      background: var(--surface-hover);
    }

    &[data-disabled],
    &:disabled {
      opacity: 0.35;
      cursor: default;
    }
  }

  :global(.calendar__grid) {
    width: 100%;
    border-collapse: collapse;
  }

  :global(.calendar__weekdays) {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }

  :global(.calendar__week) {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-block-start: 2px;
  }

  :global(.calendar__headcell) {
    font-size: 0.7rem;
    color: var(--muted);
    font-weight: 400;
    text-align: center;
  }

  :global(.cell) {
    text-align: center;
    padding: 0;
  }

  :global(.cell__day) {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    width: 100%;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    color: var(--fg);
    background: var(--surface);
    cursor: pointer;

    &:hover:not([data-disabled]) {
      background: var(--surface-hover);
    }

    &[data-outside-month] {
      opacity: 0.35;
    }

    &[data-disabled] {
      color: var(--muted);
      background: none;
      cursor: default;
      pointer-events: none;
    }

    &[data-today] {
      box-shadow: inset 0 0 0 1px var(--muted);
    }
  }

  // The page's own date (the `date` prop), separate from [data-today] above: this calendar
  // is mostly opened to catch up on a day that isn't today, so the two need to stay visually
  // distinct. An outline, not border/box-shadow, so it never fights the status or today ring.
  :global(.cell__day--current) {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  // Three genuinely different hues (not just the same accent at different opacities), so
  // status reads at a glance instead of requiring a side-by-side comparison. A border, not
  // box-shadow, so it layers with the [data-today] ring above instead of overwriting it.
  :global(.cell__day--unsolved:not([data-disabled])) {
    background: color-mix(in oklab, var(--danger) 24%, var(--surface));
    border: 1px solid color-mix(in oklab, var(--danger) 55%, transparent);
  }

  :global(.cell__day--partial:not([data-disabled])) {
    background: color-mix(in oklab, var(--accent) 34%, var(--surface));
    border: 1px solid color-mix(in oklab, var(--accent) 65%, transparent);
  }

  :global(.cell__day--solved:not([data-disabled])) {
    background: color-mix(in oklab, var(--rust-green) 58%, var(--surface));
    border: 1px solid color-mix(in oklab, var(--rust-green) 75%, transparent);
    color: var(--accent-contrast);
    font-weight: 600;
  }

  .calendar__status {
    margin: var(--space-2) 0 0;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .calendar__legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-block-start: var(--space-3);
    font-size: 0.7rem;
    color: var(--muted);
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;

    &--unsolved {
      background: color-mix(in oklab, var(--danger) 24%, var(--surface));
      border: 1px solid color-mix(in oklab, var(--danger) 55%, transparent);
    }

    &--partial {
      background: color-mix(in oklab, var(--accent) 34%, var(--surface));
      border: 1px solid color-mix(in oklab, var(--accent) 65%, transparent);
    }

    &--solved {
      background: color-mix(in oklab, var(--rust-green) 58%, var(--surface));
      border: 1px solid color-mix(in oklab, var(--rust-green) 75%, transparent);
    }
  }
</style>
