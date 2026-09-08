// The board's display theme (0/1 digits, sun/moon, or colors), shared by /play and /daily
// through Board.svelte. Persisted in localStorage always, and on the player's own PDS
// (com.tomplanche.atkuzu.preferences) when logged in, so it follows them across devices.

import { page } from "$app/state";
import toast from "svelte-french-toast";
import { toastErrorOptions, toastLoadingOptions, toastSuccessOptions } from "$lib/toast";

export type Theme = "digits" | "sunmoon" | "colors";

export const THEMES: Theme[] = ["digits", "sunmoon", "colors"];

const STORAGE_KEY = "atkuzu:theme";

let theme = $state<Theme>("digits");
// True once `syncFromPds` has actually found and applied a PDS-stored value, for the modal
// to say so. Reset on a manual pick: that value no longer reflects what's on the PDS (even
// though `set` immediately starts saving it back there).
let fetchedFromPds = $state(false);

const readStored = (): Theme | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && THEMES.includes(raw as Theme) ? (raw as Theme) : null;
  } catch {
    return null;
  }
};

const writeStored = (value: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage unavailable (private mode, quota); the choice just won't survive a reload.
  }
};

export const themeStore = {
  get theme() {
    return theme;
  },

  get fetchedFromPds() {
    return fetchedFromPds;
  },

  /** Client-only: applies the locally saved choice, if any. `localStorage` doesn't exist
   *  during SSR, so this is called once from the root layout's effect, not at module init. */
  hydrate() {
    const stored = readStored();
    if (stored) {
      theme = stored;
    }
  },

  /** Cross-device sync: overwrites the local choice with the PDS's, if the player has one set
   *  there. Best-effort, called once per login/fresh load while logged in (see +layout.svelte). */
  async syncFromPds() {
    try {
      const res = await fetch("/preferences");
      if (!res.ok) {
        return;
      }

      const { theme: remote } = (await res.json()) as { theme: Theme | null };
      if (remote && THEMES.includes(remote)) {
        theme = remote;
        fetchedFromPds = true;
        writeStored(remote);
      }
    } catch {
      // Best-effort; the locally stored (or default) theme still applies.
    }
  },

  /** Applies `next` immediately, persists it locally, and (if logged in) saves it to the PDS
   *  in the background, without blocking the picker UI. */
  set(next: Theme) {
    theme = next;
    fetchedFromPds = false;
    writeStored(next);

    if (!page.data.session) {
      return;
    }

    const attempt = fetch("/preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: next })
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((result: { saved: boolean }) => {
        if (!result.saved) {
          throw new Error("not saved");
        }

        return result;
      });

    toast.promise(
      attempt,
      {
        loading: "Saving your theme to your PDS…",
        success: "Theme saved to your PDS.",
        error: "Couldn't save your theme to your PDS."
      },
      {
        success: toastSuccessOptions,
        error: toastErrorOptions,
        loading: toastLoadingOptions
      }
    );
  }
};
