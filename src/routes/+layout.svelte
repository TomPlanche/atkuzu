<script lang="ts">
	import '$lib/styles/main.scss';
	import favicon from '$lib/assets/favicon.svg';
	let { children, data } = $props();
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>atkuzu</title>
	<meta property="og:title" content="atkuzu" />
	<meta property="og:description"
		  content="A game built on the AT Protocol." />
	<meta property="description"
		  content="A game built on the AT Protocol." />
</svelte:head>

<header class="site-header">
	<div class="container site-header__inner">
		<a class="brand" href={resolve('/')}>atkuzu</a>
		{#if data.session}
			<nav class="navbar">
				<span class="welcome">{data.session.handle}</span>
				<form method="POST" action="/logout" use:enhance>
					<button class="button button--ghost" type="submit">Log out</button>
				</form>
			</nav>
		{/if}
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="container site-footer__inner">
		<a href="https://tangled.org/tomplanche.com/ATKuzu">Source on tangled.org</a>
	</div>
</footer>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklab, var(--bg) 75%, transparent);
		backdrop-filter: blur(8px);
	}

	.site-header__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding-block: var(--space-4);
	}

	.brand {
		font-weight: 700;
		font-size: 1.1rem;
		letter-spacing: -0.02em;
		color: var(--fg);
	}

	.brand:hover {
		color: var(--fg);
	}

	.navbar {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.welcome {
		color: var(--muted);
		font-size: 0.9rem;
	}

	main {
		flex: 1;
	}

	.site-footer {
		border-top: 1px solid var(--border);
	}

	.site-footer__inner {
		display: flex;
		justify-content: flex-end;
		padding-block: var(--space-4);
		font-size: 0.85rem;
		color: var(--muted);
	}
</style>
