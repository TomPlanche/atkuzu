// Loads all your OAuth settings from here and then uses the client everywhere else. metadata endpoint, jwks, etc

import { atprotoLoopbackClientMetadata, Keyset, NodeOAuthClient } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { db } from '$lib/server/db';
import { SessionStore, StateStore } from '$lib/server/atproto/storage';
import { env } from '$env/dynamic/private';
import type { OAuthClientMetadataInput } from '@atproto/oauth-types';

//You will need to change these if you are using another collection, can also change by setting the env OAUTH_SCOPES
//For permission to all you can uncomment below
// const DEFAULT_SCOPES = 'atproto transition:generic';
const DEFAULT_SCOPES = 'atproto repo:app.bsky.feed.post?action=create repo:xyz.atpoke.graph.poke';
const loadJwk = async () => {
    const raw = env.OAUTH_JWK;
    if (!raw) return undefined;
    const json = JSON.parse(raw);
    if (!json) return undefined;
    const keys = await Promise.all(
        json.map((jwk: string | Record<string, unknown>) => JoseKey.fromJWK(jwk)),
    );
    return new Keyset(keys);
};


let client: Promise<NodeOAuthClient> | null = null;

export const atpOAuthClient = async () => {
    if (!client) {
        client = (async () => {
            const rootDomain =   env.OAUTH_DOMAIN ?? '127.0.0.1:5173';
            const dev = env.DEV !== undefined;
            const isConfidential =  env.OAUTH_JWK !== undefined;

            if(!dev && env.OAUTH_DOMAIN === undefined){
                throw new Error('OAUTH_DOMAIN must be set in production');
            }

            const keyset = env.OAUTH_JWK && env.OAUTH_DOMAIN
                ? await loadJwk()
                : undefined;
            // @ts-expect-error I have no idea why it doesn't like use
            const pk = keyset?.findPrivateKey({ use: 'sig' });
            const rootUrl = `https://${rootDomain}`;
            const clientMetadata: OAuthClientMetadataInput = dev
                ? atprotoLoopbackClientMetadata(
                    `http://localhost?${new URLSearchParams([
                        ['redirect_uri', `http://${rootDomain}/oauth/callback`],
                        ['scope', env.OAUTH_SCOPES ?? DEFAULT_SCOPES],
                    ])}`,
                ) :
                {
                    client_name: env.OAUTH_CLIENT_NAME,
                    logo_uri: env.OAUTH_LOGO_URI,
                    client_id: `${rootUrl}/oauth-client-metadata.json`,
                    client_uri: rootUrl,
                    redirect_uris: [`${rootUrl}/oauth/callback`],
                    scope: env.OAUTH_SCOPES ?? DEFAULT_SCOPES,
                    grant_types: ['authorization_code', 'refresh_token'],
                    application_type: 'web',
                    token_endpoint_auth_method: isConfidential ? 'private_key_jwt' : 'none',
                    dpop_bound_access_tokens: true,
                    jwks_uri: isConfidential ? `${rootUrl}/.well-known/jwks.json` : undefined,
                    token_endpoint_auth_signing_alg: isConfidential ? pk?.alg : undefined,
                    tos_uri: env.OAUTH_TOS_URI,
                    policy_uri: env.OAUTH_POLICY_URI,
                };

            return new NodeOAuthClient({
                stateStore: new StateStore(db),
                sessionStore: new SessionStore(db),
                keyset,
                clientMetadata,
                // Not needed since this all runs locally to one machine I believe. But if you do run multiple instances and change out the DB from sqlite may need this
                // https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-node#requestlock
                requestLock: undefined,
            });
        })();
    }
    return client;
};