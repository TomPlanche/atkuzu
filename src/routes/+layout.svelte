<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	let { children, data } = $props();
	import { enhance } from '$app/forms';
</script>

<style>
	nav {
		border-bottom: 1px solid black;
	}

	.navbar ol {
		list-style-type: none;
		padding-left: 0;
		margin: 0;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.75rem;
		padding-bottom: 1%;
	}

	.link {
		display: inline-block;
	}

	.welcome {
		font-weight: bold;
		margin-bottom: 10px;
	}

</style>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>atkuzu</title>
	<meta property="og:title" content="atkuzu" />
	<meta property="og:description"
		  content="A game built on the AT Protocol." />
	<meta property="description"
		  content="A game built on the AT Protocol." />
</svelte:head>

{#if data.session}
	<nav class="navbar">
		{#if data.session.did}
			<h3 class="welcome"> Welcome {data.session.handle} </h3>
		{/if}
		<ol>
			<li>
				<form method="POST" action="/logout" use:enhance>
					<button class="link" type="submit" >logout</button>
				</form>
			</li>
			<li>
				<a href="/">Home</a>
			</li>
		</ol>
	</nav>
{/if}
<main>
	{@render children()}
</main>