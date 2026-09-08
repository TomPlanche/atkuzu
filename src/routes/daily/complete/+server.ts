// Verifies a solved daily server-side (the client never holds the solution) and, if the
// player is logged in, writes com.tomplanche.atkuzu.result / .stats to their own PDS.
// See src/routes/daily/README.md.

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { type DailyFile, dailyFileUrl } from "$lib/game/daily";
import { sha256Hex } from "$lib/game/hash";
import { recordDailyCompletion } from "$lib/server/atproto/records";
import { logger } from "$lib/server/logger";
import { BOARD_SIZES, type BoardSize } from "$lib/game/board";

type Body = {
  date: string;
  size: BoardSize;
  /** Row-major, no separators, `0`/`1` only, see $lib/game/board.ts's encodeGrid. */
  board: string;
  durationSeconds: number;
  toggleCount: number;
};

const isValidBody = (body: Partial<Body>): body is Body =>
  typeof body.date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(body.date) &&
  BOARD_SIZES.includes(body.size as BoardSize) &&
  typeof body.board === "string" &&
  typeof body.durationSeconds === "number" &&
  body.durationSeconds >= 0 &&
  typeof body.toggleCount === "number" &&
  body.toggleCount >= 0;

export const POST: RequestHandler = async (event) => {
  const body = (await event.request.json()) as Partial<Body>;
  if (!isValidBody(body)) {
    return error(400, "invalid body");
  }
  const { date, size, board, durationSeconds, toggleCount } = body;

  const atpAgent = event.locals.atpAgent;
  const did = event.locals.session?.did;
  if (!atpAgent || !did) {
    return json({ recorded: false, reason: "not-authenticated" });
  }

  const dailyRes = await event.fetch(dailyFileUrl(date));
  if (!dailyRes.ok) {
    return error(404, "no daily archive for that date");
  }

  const daily: DailyFile = await dailyRes.json();
  const puzzle = daily.puzzles.find((p) => p.size === size);
  if (!puzzle) {
    return error(404, "no puzzle of that size for that date");
  }

  const hash = await sha256Hex(board);
  if (hash !== puzzle.solutionSha256) {
    return error(400, "board does not match the solution");
  }

  let result: { status: "created" | "already-recorded"; rkey: string };
  try {
    result = await recordDailyCompletion(atpAgent, did, {
      date,
      size,
      durationSeconds,
      toggleCount,
      isTest: env.DEV !== undefined
    });
  } catch (err) {
    logger.error(`failed to record daily completion for ${did}: ${(err as Error).message}`);

    return json({ recorded: false, reason: "write-failed" }, { status: 502 });
  }

  return json({
    recorded: true,
    alreadyRecorded: result.status === "already-recorded",
    rkey: result.rkey
  });
};
