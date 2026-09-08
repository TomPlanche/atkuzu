// Looks up the player's own com.tomplanche.atkuzu.result records for a given date, one
// per size, so a puzzle solved on another device shows as solved here too once logged in.
// Rkeys are deterministic (see recordDailyCompletion), so this is a handful of direct
// getRecord calls, not a listRecords scan. See src/routes/daily/README.md.

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { DAILY_SIZES, type DailySize, puzzleNumber } from "$lib/game/daily";
import { isRecordNotFound, RESULT_COLLECTION } from "$lib/server/atproto/records";
import { logger } from "$lib/server/logger";

type ResultEntry = {
  rkey: string;
  durationSeconds: number;
  toggleCount: number;
  createdAt: string;
};
type ResultValue = { durationSeconds?: number; toggleCount?: number; createdAt?: string };

export const GET: RequestHandler = async (event) => {
  const date = event.url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ results: {} });
  }

  const atpAgent = event.locals.atpAgent;
  const did = event.locals.session?.did;
  if (!atpAgent || !did) {
    return json({ results: {} });
  }

  const num = puzzleNumber(date);
  const isTest = env.DEV !== undefined;

  const results: Partial<Record<DailySize, ResultEntry>> = {};

  await Promise.all(
    DAILY_SIZES.map(async (size) => {
      const rkey = `${isTest ? "test-" : ""}${num}-${size}`;

      try {
        const res = await atpAgent.com.atproto.repo.getRecord({
          repo: did,
          collection: RESULT_COLLECTION,
          rkey
        });

        const value = res.data.value as ResultValue;
        results[size] = {
          rkey,
          durationSeconds: value.durationSeconds ?? 0,
          toggleCount: value.toggleCount ?? 0,
          createdAt: value.createdAt ?? `${date}T00:00:00.000Z`
        };
      } catch (err) {
        if (!isRecordNotFound(err)) {
          logger.warn(
            `failed to look up daily status for ${did}, size ${size}: ${(err as Error).message}`
          );
        }
      }
    })
  );

  return json({ results });
};
