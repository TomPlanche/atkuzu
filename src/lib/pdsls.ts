const PDSLS_ORIGIN = "https://pdsls.dev/at://";

/** Links to a DID's repo root on pdsls.dev, e.g. to browse a player's own records. */
export const pdslsProfileUrl = (did: string): string => `${PDSLS_ORIGIN}${did}`;

/** Links to a single record on pdsls.dev. */
export const pdslsRecordUrl = (did: string, collection: string, rkey: string): string =>
  `${PDSLS_ORIGIN}${did}/${collection}/${rkey}`;
