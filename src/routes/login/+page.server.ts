import { isRedirect, redirect } from '@sveltejs/kit';
import { atpOAuthClient } from '$lib/server/atproto/client';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
  if(event.locals.session) {
    return redirect(302, '/');
  }
  return;
};

export const actions = {
  default: async ({ request }) => {
    try {
      const form = await request.formData();
      const handle = String(form.get('handle') ?? '').trim();
      const client = await atpOAuthClient();
      const url = await client.authorize(handle);
      redirect(303, url);
    }
    catch (err) {
      //redirects are errors, so this passes it along
      if (isRedirect(err)) throw err;

      const errorMessage = (err as Error).message;
      logger.error(errorMessage);
      return fail(400, { error: errorMessage });
    }
  }
} satisfies Actions;