# Third-party notices

atkuzu is licensed under the terms in [LICENSE.md](LICENSE.md). It is forked from and bundles or builds upon the following third-party work, each under its own license.

## Base template

- **atproto-sveltekit-template**: the OAuth/session/DB scaffolding this project started from (client setup, cookie sessions, drizzle key/value + session stores, hooks, deploy configs).
  Source: <https://tangled.org/pds.dad/atproto-sveltekit-template>. **MIT.**

## Design & UI

- **Zed** (zed.dev): the color palette (`--zed-blue`, `--zed-blue-text`, `--zed-dark`) and the [Button](src/lib/components/Button.svelte) component's styling (solid bevelled buttons that flatten on hover/press, `<kbd>` keyboard-shortcut badges) are modeled on zed.dev's own site, in particular its "Download now" button.
  <https://zed.dev>.
- **Tangled** (tangled.org): the Dolly mark used next to "Source on tangled.org" in the footer, taken from Tangled's own brand assets ("Mark only", white on black).
  <https://tangled.org/brand>.
- **Lucide**: icon paths used throughout the UI (play, reset, log out, sign up).
  <https://lucide.dev> (ISC).

## Runtime dependencies

- **@atproto/*** (`api`, `common`, `crypto`, `jwk-jose`, `oauth-client-node`, `oauth-types`): AT Protocol client, crypto and OAuth libraries.
  <https://github.com/bluesky-social/atproto> (MIT).
- **drizzle-orm** / **drizzle-kit**: SQL ORM and migration toolkit.
  <https://github.com/drizzle-team/drizzle-orm> (Apache-2.0).
- **better-sqlite3**: the sqlite driver backing the session and cache stores.
  <https://github.com/WiseLibs/better-sqlite3> (MIT).
- **pino**: structured logging.
  <https://github.com/pinojs/pino> (MIT).

## Network services

- **Bluesky public appview** (`public.api.bsky.app`): used by [HandleInput.svelte](src/lib/components/HandleInput.svelte) to search for AT Protocol handles during login. No auth, called client-side, results are not persisted beyond the recently-picked handles kept in the browser's `localStorage`.
