// A key value key to the database that is mostly used for atproto session storage and state storage during the oauth session creation
// The "stores" are divided up by a where on the store type so it can share the same interface just with that

import { db } from "./db";
import { keyValueStore } from "./db/schema";
import { and, eq } from "drizzle-orm";

export const SESSION_STORE = "sessions";
export const STATE_STORE = "states";

export class Cache {
  db: typeof db;
  cacheName: string;

  constructor(database: typeof db, cacheName: string) {
    this.db = database;
    this.cacheName = cacheName;
  }

  async get(key: string) {
    const result = await this.db
      .select()
      .from(keyValueStore)
      .where(and(eq(keyValueStore.key, key), eq(keyValueStore.storeName, this.cacheName)))
      .limit(1);
    if (result.length > 0) {
      return result[0].value;
    }
    return null;
  }

  async set(key: string, value: string) {
    return this.db
      .insert(keyValueStore)
      .values({ key, value, storeName: this.cacheName, createdAt: new Date() })
      .onConflictDoUpdate({
        target: keyValueStore.key,
        set: { value, createdAt: new Date() }
      });
  }

  async delete(key: string) {
    return this.db.delete(keyValueStore).where(eq(keyValueStore.key, key));
  }
}
