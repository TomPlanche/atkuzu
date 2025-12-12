// This wrappers around https://tangled.org/mary.my.id/atcute packages that call https://constellation.microcosm.blue
// Constellation is a great way to get how records are connected without an appview, like seeing who and how many people has poked you!
import { Client, ok, simpleFetchHandler } from '@atcute/client';
import { env } from '$env/dynamic/public';
import type {} from '@atcute/microcosm';
import type { Did } from '@atproto/api';

//Loads who has poked you using https://constellation.microcosm.blue
export const getPokes = async (did: string, count: number = 10, cursor: string | undefined = undefined) => {
    const constellation = new Client({
        handler: simpleFetchHandler({ service:  env.PUBLIC_CONSTELLATION_ENDPOINT ?? 'https://constellation.microcosm.blue' }),
    });
    const backlinks = await ok(
        constellation.get('blue.microcosm.links.getBacklinks', {
            params: {
                subject: did as Did,
                source: 'xyz.atpoke.graph.poke:subject',
                limit: count,
                cursor
            },
        }),
    );

    return backlinks;
};

//Gets the users handle via https://slingshot.microcosm.blue
//You will want to somewhat cache the results from this. I am on the front end so if someone pokes someone 10 times it only resolves the handle once
export const getHandle = async (did: string) => {
    const slingshot = new Client({
        handler: simpleFetchHandler({ service: env.PUBLIC_SLINGSHOT_ENDPOINT ?? 'https://slingshot.microcosm.blue' }),
    });

    const resolved = await ok(
        slingshot.get('com.bad-example.identity.resolveMiniDoc', {
            params: {
                identifier: did as Did,
            },
        }),
    );

    return resolved.handle;
};