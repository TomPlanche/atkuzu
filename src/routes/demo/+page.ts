import type { PageLoad } from './$types';
import { getPokes } from '$lib/constellation';

export const load: PageLoad = async (event) => {

    const backlinks = await getPokes(event.data.usersDid);
    return {
        totalPoked: backlinks.total,
        usersDid: event.data.usersDid
    };
};