<script lang="ts">
	import type { PageProps } from './$types';
	import { resolve } from '$app/paths';
	let { data }: PageProps = $props();
</script>

<section class="hero">
	<h1>atkuzu</h1>
	<p class="tagline">
		A game built on the <a href="https://atproto.com">AT Protocol</a>. Your data lives in your
		own PDS, this is just the client.
	</p>
	{#if data.session}
		<p class="logged-in">Logged in as <strong>{data.session.handle}</strong>.</p>
	{:else}
		<a class="button" href={resolve('/login')}>Login to play</a>
	{/if}
</section>

<style>
	.hero {
		padding-block: var(--space-12) var(--space-8);
	}

	.tagline {
		max-width: 32rem;
		color: var(--muted);
	}

	.logged-in {
		color: var(--muted);
	}
</style>
