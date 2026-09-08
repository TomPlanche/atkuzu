// Reads/writes com.tomplanche.atkuzu.preferences (the player's board display preference) on
// their own PDS. Same singleton-record pattern as $lib/server/atproto/records.ts's stats
// handling, just for a display setting instead of gameplay history.

import type { Agent } from "@atproto/api";
import { isRecordNotFound } from "$lib/server/atproto/records";

const PREFERENCES_COLLECTION = "com.tomplanche.atkuzu.preferences";
const PREFERENCES_RKEY = "self";

export type Theme = "digits" | "sunmoon" | "colors";

export const THEMES: Theme[] = ["digits", "sunmoon", "colors"];

type PreferencesValue = { theme?: Theme };

/** `null` when the player has never set a preference, not an error. */
export const getTheme = async (agent: Agent, did: string): Promise<Theme | null> => {
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PREFERENCES_COLLECTION,
      rkey: PREFERENCES_RKEY
    });

    const value = res.data.value as PreferencesValue;
    return THEMES.includes(value.theme as Theme) ? (value.theme as Theme) : null;
  } catch (err) {
    if (!isRecordNotFound(err)) {
      throw err;
    }

    return null;
  }
};

export const writeTheme = async (agent: Agent, did: string, theme: Theme): Promise<void> => {
  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: PREFERENCES_COLLECTION,
    rkey: PREFERENCES_RKEY,
    // Not every PDS resolves third-party lexicons over the network for validation yet, same
    // caveat as records.ts and the README's Lexicons section.
    validate: false,
    record: {
      $type: PREFERENCES_COLLECTION,
      theme,
      updatedAt: new Date().toISOString()
    }
  });
};
