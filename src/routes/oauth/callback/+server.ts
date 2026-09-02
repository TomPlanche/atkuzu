import type { RequestHandler } from './$types';
import { isRedirect, type RequestEvent } from '@sveltejs/kit';
import { atpOAuthClient } from '$lib/server/atproto/client';
import { getSessionManager } from '$lib/server/session';
import { error, redirect } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { Agent } from '@atproto/api';

export const GET: RequestHandler = async (event: RequestEvent) => {
    try{
        const params = new URLSearchParams(event.request.url.split('?')[1]);
        const client = await atpOAuthClient();
        const { session } = await client.callback(params);

        //Should error out if we can't make a successful getSession call
        const agent = new Agent(session);
        const atpSession = await agent.com.atproto.server.getSession();
        const sessionManager = await getSessionManager();
        await sessionManager.createAndSetSession(event, session.did, atpSession.data.handle);

        return redirect(302, '/');

    }catch (err){
        //redirects are errors, so this passes it along
        if (isRedirect(err)) throw err;

        const errorMessage = (err as Error).message;
        logger.error(`Error on oauth callback: ${errorMessage}`);
        return error(500, { message: (err as Error).message });
    }
};
