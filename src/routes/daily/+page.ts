import { dailyFileUrl, todayUtcDate, type DailyFile } from "$lib/game/daily";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const date = todayUtcDate();
  const response = await fetch(dailyFileUrl(date));

  if (!response.ok) {
    return { date, daily: null as DailyFile | null };
  }

  const daily: DailyFile = await response.json();

  return { date, daily };
};
