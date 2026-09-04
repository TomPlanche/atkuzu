/**
 * delete-record.ts: delete a single record from the account's own PDS. Mainly for
 * clearing out `test-`-prefixed com.tomplanche.atkuzu.result/.stats records left behind
 * by local (`DEV`) testing of the daily-completion write path.
 *
 * Requires the same env vars as lexicons:publish:
 *   ATKUZU_PUBLISH_IDENTIFIER  handle or DID of the account that owns the record
 *   ATKUZU_PUBLISH_PASSWORD    app password (Settings → App Passwords)
 *   ATKUZU_PDS                 optional PDS override; by default resolved from the
 *                              account's DID document
 *
 * Usage:  ATKUZU_PUBLISH_IDENTIFIER=... ATKUZU_PUBLISH_PASSWORD=... \
 *           npm run records:delete -- com.tomplanche.atkuzu.result test-1-6
 */
import "dotenv/config";

const [collection, rkey] = process.argv.slice(2);

if (!collection || !rkey) {
  console.error("Usage: tsx scripts/delete-record.ts <collection> <rkey>");
  process.exit(1);
}

const identifier = process.env.ATKUZU_PUBLISH_IDENTIFIER;
const password = process.env.ATKUZU_PUBLISH_PASSWORD;

if (!identifier || !password) {
  console.error(
    "Set ATKUZU_PUBLISH_IDENTIFIER and ATKUZU_PUBLISH_PASSWORD (app password) to delete."
  );
  process.exit(1);
}

const APPVIEW = "https://public.api.bsky.app";

/** Resolve a handle or DID to its DID. */
const resolveDid = async (id: string): Promise<string> => {
  if (id.startsWith("did:")) {
    return id;
  }

  const res = await fetch(
    `${APPVIEW}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(id)}`
  );

  if (!res.ok) {
    throw new Error(`could not resolve handle ${id}`);
  }

  return ((await res.json()) as { did: string }).did;
};

/** Resolve a DID's PDS service endpoint from its DID document. */
const resolvePds = async (did: string): Promise<string> => {
  const docUrl = did.startsWith("did:web:")
    ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
    : `https://plc.directory/${did}`;

  const res = await fetch(docUrl);
  if (!res.ok) {
    throw new Error(`could not fetch DID document for ${did}`);
  }

  const doc = (await res.json()) as {
    service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
  };
  const svc = (doc.service ?? []).find(
    (s) => s.id.endsWith("#atproto_pds") || s.type === "AtprotoPersonalDataServer"
  );

  if (!svc?.serviceEndpoint) {
    throw new Error(`no PDS endpoint in DID document for ${did}`);
  }

  return svc.serviceEndpoint;
};

const did0 = await resolveDid(identifier);

let pds = process.env.ATKUZU_PDS;
if (!pds) {
  console.log("no ATKUZU_PDS provided, looking for PDS via DID document...");
  pds = await resolvePds(did0);
  console.log(`found PDS: ${pds}`);
}

const xrpc = async (method: string, body: unknown, token?: string): Promise<unknown> => {
  const res = await fetch(`${pds}/xrpc/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`${method} -> ${res.status}: ${JSON.stringify(data)}`);
  }

  return data;
};

const session = (await xrpc("com.atproto.server.createSession", { identifier, password })) as {
  did: string;
  accessJwt: string;
};
const did = session.did;
const token = session.accessJwt;
console.log(`authenticated as ${did}`);

await xrpc("com.atproto.repo.deleteRecord", { repo: did, collection, rkey }, token);
console.log(`deleted ${collection}/${rkey}`);
