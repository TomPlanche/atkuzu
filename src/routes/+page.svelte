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
    <p> It's up to you on what this project should be and what it looks like. Fork the project on <a href="https://tangled.org/baileytownsend.dev/atproto-sveltekit-template">tangled.org</a> to make it your own. This web hosted version is mostly just a technical preview showing a demo of what the application looks like and how it works, not a lot here, or even styling that's up to you, not me. But if you <a href="/login">Login</a> you can poke people or see who poked you, so there's that at least.</p>
    <h3>A bare minimal SvelteKit demo that...</h3>
    <ul>
        <li>Can have local dev oauth with setting the <code>.env</code> variable <code>DEV=true</code></li>
        <li>Can switch to production oauth when you set the <code>OAUTH_DOMAIN</code>
            variable to a domain like <code>mycoolwebsite.xyz</code>
            and making sure the website is server to the internet</li>
        <li>A persistent session store using <a href="https://orm.drizzle.team/">drizzle</a> with sqlite</li>
        <li>A docker compose and documentation on how to deploy to <a href="https://railway.com/">railway</a></li>
        <li><a href="/demo">An example page using the atproto Agent where you can make a post or poke someone</a> </li>
        <li>Uses <a href="https://microcosm.blue" class="link"><span
                style="color: rgb(243, 150, 169);">m</span><span style="color: rgb(244, 156, 92);">i</span><span
                style="color: rgb(199, 176, 76);">c</span><span style="color: rgb(146, 190, 76);">r</span><span
                style="color: rgb(78, 198, 136);">o</span><span style="color: rgb(81, 194, 182);">c</span><span
                style="color: rgb(84, 190, 215);">o</span><span style="color: rgb(143, 177, 241);">s</span><span
                style="color: rgb(206, 157, 241);">m</span></a> for demoing some AppView-less features you can do, like seeing who has poked you without a backend.
        </li>
        <li>Source code can be found on <a href="https://tangled.org/baileytownsend.dev/atproto-sveltekit-template">tangled.org</a> </li>
    </ul>
    <br/>
    {#if !data.session}
        <a href="/login">Login</a>
    {/if}
</div>