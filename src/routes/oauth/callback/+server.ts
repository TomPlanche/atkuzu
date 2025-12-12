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

    // const agent = new Agent(session);
    // const dateStamp = new Date().toISOString();
    // let token
    // await agent.com.atproto.repo.createRecord({
    //     collection: 'app.bsky.feed.post',
    //     record: {
    //         $type: 'app.bsky.feed.post',
    //         text: 'I found Bailey\'s new SvelteKit template before he finished it and wrote documentation for it. I probably should of checked what it did first.',
    //         langs: [
    //             'en'
    //         ],
    //         reply: {
    //             root: {
    //                 cid: 'bafyreigxcmxkn6egt5ykybaaztnbbkq74facddwva65bwxfyfqrevtpk64',
    //                 uri: 'at://did:plc:rnpkyqnmsw4ipey6eotbdnnf/app.bsky.feed.post/3m7mi36bsp22u'
    //             },
    //             parent: {
    //                 cid: 'bafyreigxcmxkn6egt5ykybaaztnbbkq74facddwva65bwxfyfqrevtpk64',
    //                 uri: 'at://did:plc:rnpkyqnmsw4ipey6eotbdnnf/app.bsky.feed.post/3m7mi36bsp22u'
    //             }
    //         },
    //         createdAt: dateStamp,
    //     }, repo: session.did,  validate: true
    //
    // }

    return redirect(302, '/demo');

    }catch (err){
        //redirects are errors, so this passes it along
        if (isRedirect(err)) throw err;

        const errorMessage = (err as Error).message;
        logger.error(`Error on oauth callback: ${errorMessage}`);
        return error(500, { message: (err as Error).message });
    }
};
