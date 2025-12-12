<script lang="ts">
	import type { PageProps } from './$types';
	import { enhance } from '$app/forms';
	import HandleInput from '$lib/components/HandleInput.svelte';

	let { form }: PageProps = $props();

	let handle = $state('');
</script>

<style>
	.login-form {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.login-button {
		align-self: start;
	}
</style>

<h1>ATProtocol OAuth Login</h1>

<form action="/login" method="POST" use:enhance>
	<label for="handle">ATProtocol Handle</label>
	<div class="login-form">
		<HandleInput bind:value={handle} id="handle" required placeholder="jcsalterego.bsky.social" />
		<button class="login-button" type="submit">Submit</button>
	</div>
	<br />
	{#if form?.error}
		<p>{form.error}</p>
	{/if}
</form>
