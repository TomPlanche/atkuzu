// Plays or views a past daily archive. `/daily` itself always covers today; this route is
// for catching up on a missed day (see src/routes/daily/README.md).

import { error, redirect } from "@sveltejs/kit";
import { dailyFileUrl, todayParisDate, type DailyFile } from "$lib/game/daily";
import type { PageLoad } from "./$types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageLoad = async ({ fetch, params }) => {
  const { date } = params;

  if (!DATE_PATTERN.test(date)) {
    return error(404, "not found");
  }

  const today = todayParisDate();
  if (date === today) {
    return redirect(308, "/daily");
  }
  if (date > today) {
    return error(404, "not found");
  }

  const response = await fetch(dailyFileUrl(date));
  if (!response.ok) {
    return error(404, "no daily archive for that date");
  }

  const daily: DailyFile = await response.json();

  return { date, daily };
};
