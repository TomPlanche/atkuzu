<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/Button.svelte";
  import { loginModal } from "$lib/state/login-modal.svelte";
  import { rulesModal } from "$lib/state/rules-modal.svelte";
  import { themeModal } from "$lib/state/theme-modal.svelte";
  import { pdslsProfileUrl } from "$lib/pdsls";

  type Props = {
    session: App.Session | null;
  };

  let { session }: Props = $props();

  // The Sign Up link below keeps href="/login" as a no-JS fallback; this handler
  // just intercepts the click to open the modal instead when JS is available.
  const openLoginModal = (event: MouseEvent) => {
    event.preventDefault();
    loginModal.show();
  };
</script>

{#snippet logoutIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  </svg>
{/snippet}

{#snippet themeIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="9" cy="12" r="7" />
    <circle cx="15" cy="12" r="7" />
  </svg>
{/snippet}

{#snippet signUpIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </svg>
{/snippet}

<header class="site-header">
  <div class="container site-header__inner">
    <div class="site-header__left">
      <a class="brand" href={resolve("/")}>atkuzu</a>
      <a class="nav-link" href={resolve("/daily")}>Daily</a>
      <button class="nav-link nav-link--btn" type="button" onclick={() => rulesModal.show()}>
        How to play
      </button>
      <button
        class="theme-btn"
        type="button"
        aria-label="Board theme"
        onclick={() => themeModal.show()}
      >
        {@render themeIcon()}
      </button>
    </div>
    {#if session}
      <nav class="navbar">
        <!-- pdslsProfileUrl always returns an absolute https://pdsls.dev/... URL -->
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <a
          class="welcome"
          href={pdslsProfileUrl(session.did)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {session.handle}
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
        <form method="POST" action="/logout" use:enhance>
          <Button variant="secondary" icon={logoutIcon} type="submit">Log out</Button>
        </form>
      </nav>
    {:else}
      <nav class="navbar">
        <Button href={resolve("/login")} icon={signUpIcon} letter="S" onclick={openLoginModal}>
          Sign Up
        </Button>
      </nav>
    {/if}
  </div>
</header>

<style lang="scss">
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklab, var(--bg) 75%, transparent);
    backdrop-filter: blur(8px);

    &__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-block: var(--space-4);
    }
  }

  .site-header__left {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .brand {
    font-weight: 700;
    font-size: 1.1rem;
    letter-spacing: -0.02em;
    color: var(--fg);

    &:hover {
      color: var(--fg);
    }
  }

  .nav-link {
    font-size: 0.9rem;
    color: var(--muted);

    &:hover {
      color: var(--fg);
    }
  }

  .nav-link--btn {
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
  }

  .theme-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    padding: 0;
    color: var(--muted);
    cursor: pointer;

    :global(svg) {
      width: 100%;
      height: 100%;
    }

    &:hover {
      color: var(--fg);
    }
  }

  .navbar {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .welcome {
    color: var(--muted);
    font-size: 0.9rem;

    &:hover {
      color: var(--fg);
    }
  }
</style>
