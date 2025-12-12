<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import HandleInput from '$lib/components/HandleInput.svelte';
	import { getHandle, getPokes } from '$lib/constellation';

	type Poker = { handle: string, did: string, pokes: number };
	let pokers = $state<Poker[]>([]);
	let { form, data }: PageProps = $props();
	let handleQuery = $state('');
	let constellationCursor = $state<string | undefined>(undefined);

	const bskyPostText = (handle: string) => encodeURIComponent(`I just poked  @${handle} with demo.atpoke.xyz`);

	const didWeAlreadyFindTheHandle = (did: string) => pokers.find((p) => p.did === did);

	//Shows how you can load backlinks from constellation to see who has poked you.
	const loadWhoPoked = async () => {
		//Gets a list of who all has poked you from constellation
		const backLinks = await getPokes(data.usersDid,  25, constellationCursor);
		constellationCursor = backLinks.cursor;
		if(backLinks.records.length > 0 ){
			 for (const record of backLinks.records) {
				 //No need to do a second call if we already found the handle
				 const alreadyFoundHandle = didWeAlreadyFindTheHandle(record.did);
				 if(alreadyFoundHandle){
					 alreadyFoundHandle.pokes++;
				 }else{
					 pokers.push({
						 //Example showing you how you can easily get a handle from a did with slingshot
						 handle: await getHandle(record.did),
						 did: record.did,
						 pokes: 1
					 });
				 }
			 }
		}
	};


</script>

<style>
	.error {
		color: red;
	}

	textarea {
		width: 75%;
		height: 100px;
	}

 .poke-form {
 	   display: flex;
	   flex-direction: row;
	   align-items: center;
 	}

 .poke-button {
		align-self: start;
 	}

	.give-me-some-space {
		margin-bottom: 10px
	}
</style>

{#if form?.error}
	<p class="error">{form.error}</p>
{/if}

<!--Make a bluesky post demo-->

<form method="POST" action="/demo?/makeAPost" use:enhance>
	<h1>Make a Bluesky post</h1>
	<textarea name="post_text" rows="5" cols="60">
I am trying out @baileytownsend.dev's new atproto SvelteKit template.

https://tangled.org/baileytownsend.dev/atproto-sveltekit-template
	</textarea>
	<br />
	<button type="submit">Post</button>
	{#if form?.success}
		<p>Success! The post has been made</p>
	{/if}
	{#if form?.result}
		<pre>{JSON.stringify(form.result, null, 2)}</pre>
	{/if}
</form>

<!--Poke demo-->
<h1>Poke someone</h1>
<h3>You have been poked {data.totalPoked} times</h3>
<div>
	<a href="https://ufos.microcosm.blue/collection/?nsid=xyz.atpoke.graph.poke">View xyz.atproto.graph.pokes on ufos</a>
</div>

<br/>
{#if pokers.length > 0}
	<ul>
		{#each pokers as poker, index (index)}
			<li> <a href="{`https://bsky.app/profile/${poker.did}`}">{poker.handle}</a> {poker.pokes} times </li>
		{/each}
	</ul>
{/if}
{#if data.totalPoked > 0 && constellationCursor !== null}
	<button class="give-me-some-space" type="submit" onclick={loadWhoPoked}>{constellationCursor === undefined ? 'Load who poked you': 'Load more'}</button>
{/if}
<br/>

<form method="POST" action="/demo?/poke" use:enhance>
	<div class="poke-form">
		<HandleInput name="handle" bind:value={handleQuery} placeholder="Handle to poke" required showDisplayName/>
		<button class="poke-button" type="submit">Poke</button>
	</div>
	{#if form?.pokeResult}
		<span>{form.pokeResult}</span>
		<a href={`https://bsky.app/intent/compose?text=${bskyPostText(form?.pokedHandle)}`}>Tell them about it on Bluesky!</a>
	{/if}
</form>
