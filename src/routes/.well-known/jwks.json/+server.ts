//Loads the public jwk's which are needed for a confidential client
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { atpOAuthClient } from '$lib/server/atproto/client';

export const GET: RequestHandler = async () => {
    const client = await atpOAuthClient();

    return json(client.jwks, {
        headers: {
            'Cache-Control': 'no-store'
        }
    });
};
