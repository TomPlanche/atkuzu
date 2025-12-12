import type { Agent } from '@atproto/api';
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Session {
			did: string;
			handle: string;
		}
		interface Locals {
			session: Session | null;
			atpAgent: Agent | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
