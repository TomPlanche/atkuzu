<script lang="ts">
    import type { PageProps } from './$types';
    import { resolve } from '$app/paths';
    let { data }: PageProps = $props();
</script>

<style>
    a {
        text-decoration: underline darkblue;
    }
</style>

<div>
    <h1>atkuzu</h1>
    <p>A game built on the <a href="https://atproto.com">AT Protocol</a>. Your data lives in your own PDS, this is just the client.</p>
    {#if data.session}
        <p>Logged in as <strong>{data.session.handle}</strong>.</p>
    {:else}
        <p><a href={resolve('/login')}>Login</a> to play.</p>
    {/if}
</div>
