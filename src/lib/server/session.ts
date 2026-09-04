// A cookie session store based on https://lucia-auth.com/ examples which is recommended from Svelte's docs
// Creates a cookie that links to a session store inside the database allowing the atproto oauth session to be loaded

import { db } from "./db";
import { atpOAuthClient } from "./atproto/client";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { DAY } from "@atproto/common";
import { sessionStore } from "$lib/server/db/schema";
import type { RequestEvent } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { logger } from "$lib/server/logger";

export class SessionRestorationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionRestorationError";
  }
}

// This is a sliding expiration for the cookie session. Can change it if you want it to be less or more.
// The actual atproto session goes for a while if it's a confidential client as long as it's refreshed
// https://atproto.com/specs/oauth#tokens-and-session-lifetime
const DEFAULT_EXPIRY = 30 * DAY;

const NULL_SESSION_RESPONSE = { atpAgent: null, did: null, handle: null };

export class Session {
  db: typeof db;
  atpOAuthClient: NodeOAuthClient;

  constructor(database: typeof db, oauthClient: NodeOAuthClient) {
    this.db = database;
    this.atpOAuthClient = oauthClient;
  }

  async validateSessionToken(token: string): Promise<SessionValidationResult> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const result = await this.db
      .select()
      .from(sessionStore)
      .where(eq(sessionStore.id, sessionId))
      .limit(1);
    if (result.length > 1) {
      throw new Error("Multiple sessions found for token. Should not happen");
    }
    if (result.length === 0) {
      return NULL_SESSION_RESPONSE;
    }
    const session = result[0];

    if (Date.now() >= session.expiresAt.getTime()) {
      await this.invalidateSession(session.id);
      logger.warn(`Session expired for the did: ${session.did}`);
      return NULL_SESSION_RESPONSE;
    }
    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
      session.expiresAt = new Date(Date.now() + DEFAULT_EXPIRY);
      await this.db.update(sessionStore).set(session).where(eq(sessionStore.id, sessionId));
    }
    try {
      const oAuthSession = await this.atpOAuthClient.restore(session.did);

      const agent = new Agent(oAuthSession);
      return { atpAgent: agent, did: session.did, handle: session.handle };
    } catch (err) {
      const errorMessage = (err as Error).message;
      logger.warn(`Error restoring session for did: ${session.did}, error: ${errorMessage}`);
      //Counting any error when restoring a session as a failed session resume and deleting the users web browser session
      //You can go further and capture different types of errors
      await this.invalidateUserSessions(session.did);
      throw new SessionRestorationError(
        `Failed to restore your session: ${errorMessage}. Please log in again.`
      );
    }
  }

  private setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
    event.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      secure: import.meta.env.PROD,
      sameSite: "lax",
      expires: expiresAt
    });
  }

  deleteSessionTokenCookie(event: RequestEvent): void {
    event.cookies.set("session", "", {
      httpOnly: true,
      path: "/",
      secure: import.meta.env.PROD,
      sameSite: "lax",
      maxAge: 0
    });
  }

  async invalidateSession(sessionId: string) {
    await this.db.delete(sessionStore).where(eq(sessionStore.id, sessionId));
  }

  async invalidateSessionByToken(token: string) {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    await this.invalidateSession(sessionId);
  }

  async invalidateUserSessions(did: string) {
    await this.db.delete(sessionStore).where(eq(sessionStore.did, did));
  }

  private async createSession(token: string, did: string, handle: string) {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY);
    const session = { id: sessionId, did, handle, expiresAt, createdAt: new Date() };
    await this.db.insert(sessionStore).values(session);
    return session;
  }

  private generateSessionToken(): string {
    const tokenBytes = new Uint8Array(20);
    crypto.getRandomValues(tokenBytes);
    return encodeBase32LowerCaseNoPadding(tokenBytes);
  }

  async createAndSetSession(event: RequestEvent, did: string, handle: string) {
    const token = this.generateSessionToken();
    const session = await this.createSession(token, did, handle);
    this.setSessionTokenCookie(event, token, session.expiresAt);
    return session;
  }

  async getSessionFromRequest(event: RequestEvent): Promise<SessionValidationResult> {
    const token = event.cookies.get("session");
    if (!token) {
      return NULL_SESSION_RESPONSE;
    }
    try {
      return await this.validateSessionToken(token);
    } catch (err) {
      //We delete the cookie on any error and pass along the error
      this.deleteSessionTokenCookie(event);
      throw err;
    }
  }
}

type SessionValidationResult =
  | { atpAgent: Agent; did: string; handle: string }
  | { atpAgent: null; did: null; handle: null };

let sessionManager: Promise<Session> | null = null;

export const getSessionManager = async (): Promise<Session> => {
  if (!sessionManager) {
    sessionManager = (async () => {
      const client = await atpOAuthClient();
      return new Session(db, client);
    })();
  }
  return sessionManager;
};
