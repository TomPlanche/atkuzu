<script lang="ts">
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>

<style>
    a {
        text-decoration: underline darkblue;
    }
</style>

<div>
    <h1>SvelteKit ATProtocol OAuth template</h1>
    <h3>A build your own ATProto adventure</h3>
    <p> It's up to you on what this project should be and what it looks like. This is mostly just a technical preview showing a demo of what the application looks like and how it works. But if you <a href="/login">Login</a> you can poke people or see who poked you, so there's that at least.</p>
    <h3>A bare minimal SvelteKit demo that...</h3>
    <ul>
        <li>Can have local dev oauth with setting the <code>.env</code> variable <code>DEV=true</code></li>
        <li>Can switch to production oauth when you set the <code>OAUTH_DOMAIN</code>
            variable to a domain like <code>mycoolwebsite.xyz</code>
            and making sure the website is server to the internet</li>
        <li>A persistent session store using <a href="https://orm.drizzle.team/">drizzle</a> with sqlite</li>
        <li>A docker compose and documentation on how to deploy to <a href="https://railway.com/">railway</a></li>
        <li><a href="/demo">An example page using the atproto Agent where you can make a post or poke someone</a> </li>
        <li>Source code can be found on <a href="https://tangled.org/baileytownsend.dev/atproto-sveltekit-template">tangled.org</a> </li>
    </ul>
    <br/>
    {#if !data.session}
        <a href="/login">Login</a>
    {/if}
</div>