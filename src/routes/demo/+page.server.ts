import type { PageServerLoad } from './$types';
import { type Actions, fail, redirect } from '@sveltejs/kit';
import { RichText } from '@atproto/api';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
    if(!event.locals.session) {
        return redirect(302, '/login');
    }
    return { usersDid: event.locals.session.did };
};


export const actions = {
        makeAPost: async (event) => {
            try{
                const agent = event.locals.atpAgent;
                if (!agent) {
                    return fail(401, { error: 'Not authenticated' });
                }

                const form = await event.request.formData();
                const text = String(form.get('post_text') ?? '').trim();
                const rt = new RichText({ text });
                // Automatically detect mentions, links, hashtags
                await rt.detectFacets(agent);

                const record = {
                    $type: 'app.bsky.feed.post',
                    text: rt.text,
                    facets: rt.facets,
                    createdAt: new Date().toISOString(),
                    //This sets the language of the post. Want to most likely get it from a locale of the browser
                    //cheating here and using english since the rest of the documentations in english and this is a demo
                    langs: [
                        'en'
                    ]
                };

                const result = await agent.com.atproto.repo.createRecord({
                    repo: event.locals.session!.did,
                    collection: 'app.bsky.feed.post',
                    record: record,
                    //Since this is a known lexicon to the PDS we can validate it on creation
                    validate: true
                });


                return { success: true, result: result.data };

            }
            catch (err) {
                const errorMessage = (err as Error).message;
                logger.error(errorMessage);
                return fail(400, { error: errorMessage });
            }
        },
        poke: async (event) => {
        try{
            const agent = event.locals.atpAgent;
            if (!agent) {
                return fail(401, { error: 'Not authenticated' });
            }

            const form = await event.request.formData();
            const handle = String(form.get('handle') ?? '').trim();


            const toPokesDid = await agent.com.atproto.identity.resolveHandle({ handle });

            // Can view the lexicon schema at the below url. just doing plain json for now instead of a strong type
            // https://selfhosted.social/xrpc/com.atproto.repo.getRecord?repo=did:plc:rnpkyqnmsw4ipey6eotbdnnf&collection=com.atproto.lexicon.schema&rkey=xyz.atpoke.graph.poke
            // Ideally you should type it and pull it in and all that good stuff, but yeah you can just send json as well
            // The correct way would be using something like this https://github.com/bluesky-social/atproto/tree/main/packages/lex/lex

            const record = {
                $type: 'xyz.atpoke.graph.poke',
                subject: toPokesDid.data.did,
                createdAt: new Date().toISOString(),
            };

            await agent.com.atproto.repo.createRecord({
                repo: event.locals.session!.did,
                collection: 'xyz.atpoke.graph.poke',
                record: record,
            });

            return { pokeResult: `You just poked ${handle}!`, pokedHandle: handle };

        }
        catch (err) {
            const errorMessage = (err as Error).message;
            logger.error(errorMessage);
            return fail(400, { error: errorMessage });
        }
    }
} satisfies Actions;

