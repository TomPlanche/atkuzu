import { db } from '$lib/server/db';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import { keyValueStore } from '$lib/server/db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { STATE_STORE } from '$lib/server/cache';
import { logger } from '$lib/server/logger';
import { HOUR } from '@atproto/common';
import { getSessionManager } from '$lib/server/session';

const clearExpiredStates = async () => {
    try {
        logger.info('Running cleanup of the state store');
        const oneHourAgo = new Date(Date.now() - HOUR);
        const result = await db
            .delete(keyValueStore)
            .where(
                and(
                    eq(keyValueStore.storeName, STATE_STORE),
                    lt(keyValueStore.createdAt, oneHourAgo))
            );

        if (result.changes > 0) {
            logger.info(`Cleaned up ${result.changes} expired key(s) from keyValueStore`);
        }
    } catch (err) {
        logger.error(`${(err as Error).message}`);
    }
};


export const init: ServerInit = async () => {
    // Run Drizzle migrations on server startup
    migrate(db, { migrationsFolder: env.MIGRATIONS_FOLDER ?? 'drizzle' });

    await clearExpiredStates();

    // Start a background job to clean up state every hour, which is recommended in the oauth docs
    setInterval(async () => {
        await clearExpiredStates();
        //TODO prob should do one for the session store as well for expired sessions
    }, HOUR); // Run every hour
};

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('session') ?? null;
    if (token === null) {
        event.locals.session = null;
        event.locals.atpAgent = null;
        return resolve(event);
    }
    const sessionManager = await getSessionManager();
    const { atpAgent, did, handle } = await sessionManager.getSessionFromRequest(event);

    if(atpAgent == null){
        event.locals.session = null;
        event.locals.atpAgent = null;
        return resolve(event);
    }

    // Store atpAgent in locals (server-side only, not serialized)
    event.locals.atpAgent = atpAgent;

    // Store only serializable data in session (gets passed to client via load functions)
    event.locals.session = {
        did,
        handle
    };

    return resolve(event);
};