import type { Actions } from './$types';
import { getSessionManager } from '$lib/server/session';
import { redirect } from '@sveltejs/kit';
import { atpOAuthClient } from '$lib/server/atproto/client';

export const actions: Actions = {
    default: async (event) => {
        const token = event.cookies.get('session');

        if (token) {
            const sessionManager = await getSessionManager();
            await sessionManager.invalidateSessionByToken(token);
            sessionManager.deleteSessionTokenCookie(event);

            const oauthClient = await atpOAuthClient();
            if(event.locals.did) {
                await oauthClient.revoke(event.locals.did);
            }
        }

        redirect(303, '/');
    }
};