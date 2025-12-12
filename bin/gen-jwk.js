// forked from https://github.com/bluesky-social/statusphere-example-app/blob/main/bin/gen-jwk

import { JoseKey } from '@atproto/oauth-client-node';


async function main() {
  const kid = Date.now().toString();
  const key = await JoseKey.generate(['ES256'], kid);
  const jwk = key.privateJwk;
  console.log(JSON.stringify([jwk]));
}

await main();