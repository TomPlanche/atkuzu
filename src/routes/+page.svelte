<script lang="ts">
  import type { PageProps } from "./$types";
  import { resolve } from "$app/paths";
  import GridPreview from "$lib/components/GridPreview.svelte";
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
    stroke-linejoin="round"
  >
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
{/snippet}

<section class="hero">
  <div class="hero__text">
    <h1>atkuzu</h1>
    <p class="tagline">
      A game built on the <a href="https://atproto.com">AT Protocol</a>. Your data lives in your own
      PDS, this is just the client.
    </p>

    {#if data.session}
      <p class="logged-in">Logged in as <strong>{data.session.handle}</strong>.</p>
    {:else}
      <p class="logged-in">
        <a href={resolve("/login")} onclick={openLoginModal}>Login</a> to save your results.
      </p>
    {/if}
  </div>

  <a class="preview" href={resolve("/play")} aria-label="Play now">
    <GridPreview />
    <span class="preview__cta">
      <span class="preview__cta-pill">
        {@render playIcon()}
        Play now
      </span>
    </span>
  </a>
</section>

<style lang="scss">
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-8);
    padding-block: var(--space-12) var(--space-8);
    text-align: center;
  }

  .tagline {
    color: var(--muted);
  }

  .logged-in {
    margin-block-start: var(--space-4);
    color: var(--muted);
  }

  .preview {
    position: relative;
    display: block;
    width: 100%;
    // A flat 26rem regardless of viewport left this small on anything wider than a phone;
    // scale with the available width instead, capped so it doesn't dominate a wide desktop
    // window (a decorative teaser, not the real board /play and /daily use).
    max-width: min(90%, 42rem);
    border-radius: var(--radius-md);

    &:hover,
    &:focus-visible {
      :global(.grid-preview) {
        filter: brightness(1.15);
      }

      .preview__cta-pill {
        background: var(--accent-hover);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 4px;
    }
  }

  .preview__cta {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .preview__cta-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.5em 1em;
    border-radius: var(--radius-full);
    background: var(--accent);
    color: var(--accent-contrast);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 4px 16px 0 color-mix(in oklab, black 40%, transparent);
    transition: background var(--transition-fast);

    :global(svg) {
      width: 1em;
      height: 1em;
    }
  }
</style>
