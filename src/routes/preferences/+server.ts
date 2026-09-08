// Reads and writes the player's own com.tomplanche.atkuzu.preferences record (currently just
// the board theme). A global preference, not a /daily concept, hence living at the root.
// See src/lib/server/atproto/preferences.ts.

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getTheme, THEMES, type Theme, writeTheme } from "$lib/server/atproto/preferences";
import { logger } from "$lib/server/logger";

export const GET: RequestHandler = async (event) => {
  const atpAgent = event.locals.atpAgent;
  const did = event.locals.session?.did;
  if (!atpAgent || !did) {
    return json({ theme: null });
  }

  const theme = await getTheme(atpAgent, did);

  return json({ theme });
};

type Body = { theme: Theme };

const isValidBody = (body: Partial<Body>): body is Body =>
  typeof body.theme === "string" && THEMES.includes(body.theme as Theme);

export const POST: RequestHandler = async (event) => {
  const body = (await event.request.json()) as Partial<Body>;
  if (!isValidBody(body)) {
    return error(400, "invalid body");
  }

  const atpAgent = event.locals.atpAgent;
  const did = event.locals.session?.did;
  if (!atpAgent || !did) {
    return json({ saved: false, reason: "not-authenticated" });
  }

  try {
    await writeTheme(atpAgent, did, body.theme);
  } catch (err) {
    logger.error(`failed to write theme preference for ${did}: ${(err as Error).message}`);

    return json({ saved: false, reason: "write-failed" }, { status: 502 });
  }

  return json({ saved: true });
};
