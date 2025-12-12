//Inter faces required by oquth-client-node for storing sessions and state

import type {
    NodeSavedSession,
    NodeSavedSessionStore,
    NodeSavedState,
    NodeSavedStateStore
} from '@atproto/oauth-client-node';
import { Cache, SESSION_STORE, STATE_STORE } from '$lib/server/cache';
import { db } from '$lib/server/db';

export class StateStore implements NodeSavedStateStore{

    cache: Cache;

    constructor(database: typeof db) {
        this.cache = new Cache(database, STATE_STORE);
    }

    async del(key: string) {
         await this.cache.delete(key);
    }

    async get(key: string){
        const value = await this.cache.get(key);
        return value ? JSON.parse(value) as NodeSavedState : undefined;
    }

    async set(key: string, value: NodeSavedState) {
        const json = JSON.stringify(value);
        await this.cache.set(key, json);
    }
}

export class SessionStore implements NodeSavedSessionStore{

    cache: Cache;

    constructor(database: typeof db) {
        this.cache = new Cache(database, SESSION_STORE);
    }

    async del(key: string) {
        await this.cache.delete(key);
    }

    async get(key: string){
        const value = await this.cache.get(key);
        return value ? JSON.parse(value) as NodeSavedSession : undefined;
    }

    async set(key: string, value: NodeSavedSession) {
        const json = JSON.stringify(value);
        await this.cache.set(key, json);
    }
}