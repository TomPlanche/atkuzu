<script lang="ts">
  import type { PageProps } from "./$types";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/Button.svelte";
  import { loginModal } from "$lib/state/login-modal.svelte";
  let { data }: PageProps = $props();

  // href stays "/login" as a no-JS fallback; see +layout.svelte for the same pattern.
  const openLoginModal = (event: MouseEvent) => {
    event.preventDefault();
    loginModal.show();
  };
</script>

{#snippet playIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg
  >
{/snippet}

<section class="hero">
  <h1>atkuzu</h1>
  <p class="tagline">
    A game built on the <a href="https://atproto.com">AT Protocol</a>. Your data lives in your own
    PDS, this is just the client.
  </p>
  <Button href={resolve("/play")} icon={playIcon}>Play</Button>
  {#if data.session}
    <p class="logged-in">Logged in as <strong>{data.session.handle}</strong>.</p>
  {:else}
    <p class="logged-in">
      <a href={resolve("/login")} onclick={openLoginModal}>Login</a> to save your results.
    </p>
  {/if}
</section>

<style lang="scss">
  .hero {
    padding-block: var(--space-12) var(--space-8);
  }

  .tagline {
    max-width: 32rem;
    color: var(--muted);
  }

  .logged-in {
    margin-block-start: var(--space-4);
    color: var(--muted);
  }
</style>
