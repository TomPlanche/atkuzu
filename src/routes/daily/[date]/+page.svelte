<script lang="ts">
  import type { PageProps } from "./$types";
  import DailyPuzzle from "$lib/components/DailyPuzzle.svelte";

  let { data }: PageProps = $props();
</script>

<DailyPuzzle date={data.date} daily={data.daily} session={data.session} />
