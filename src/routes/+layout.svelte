<script lang="ts">
  import "$lib/styles/main.scss";
  import favicon from "$lib/assets/favicon.svg";
  import { replaceState } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import toast, { type DefaultToastOptions, Toaster } from "svelte-french-toast";
  import { toastSuccessOptions } from "$lib/toast";
  import Modal from "$lib/components/Modal.svelte";
  import LoginForm from "$lib/components/LoginForm.svelte";
  import HowToPlay from "$lib/components/HowToPlay.svelte";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { loginModal } from "$lib/state/login-modal.svelte";
  import { rulesModal } from "$lib/state/rules-modal.svelte";

  let { children, data } = $props();

  // svelte-french-toast ships a white, drop-shadowed default look; restyle it to match
  // this app's dark surface/border/accent palette instead (see Modal.svelte's .modal__panel
  // for the same background/border/radius combo). This base applies to every toast type;
  // success/error tint themselves further via options passed at each toast(...) call site
  // (see $lib/toast.ts for why that has to happen there instead of here).
  const toastOptions: DefaultToastOptions = {
    style:
      "border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); color: var(--fg); box-shadow: none; font-family: var(--font-sans); font-size: 0.9rem; padding: 10px 14px;"
  };

  // OAuth callback and /logout redirect here with ?toast=connected|disconnected so the
  // toast fires exactly once, right after the PDS session actually changed.
  $effect(() => {
    const kind = page.url.searchParams.get("toast");

    if (kind === "connected") {
      toast.success(
        data.session ? `Connected as ${data.session.handle}` : "Connected",
        toastSuccessOptions
      );
    } else if (kind === "disconnected") {
      toast("Disconnected");
    } else {
      return;
    }

    // Both redirect targets that set ?toast=... always land on "/", so resolving it
    // back to the bare route both satisfies svelte/no-navigation-without-resolve and
    // strips the query param in one step. Deferred: on first load this effect can run
    // before SvelteKit's router finishes starting, and replaceState throws until then.
    setTimeout(() => replaceState(resolve("/"), {}));
  });
</script>

<svelte:head>
  <link href={favicon} rel="icon" />
  <title>atkuzu</title>
  <meta content="atkuzu" property="og:title" />
  <meta content="A game built on the AT Protocol." property="og:description" />
  <meta content="A game built on the AT Protocol." property="description" />
</svelte:head>

<Toaster {toastOptions} />

<Header session={data.session} />

<main class="container">
  {@render children()}
</main>

<Modal bind:open={loginModal.open} labelledby="login-modal-title">
  <h2 id="login-modal-title">Login</h2>
  <p class="modal-subtitle">
    Sign in with your <a href="https://atproto.com/">AT Protocol</a> handle.
  </p>
  <LoginForm />
</Modal>

<Modal bind:open={rulesModal.open} labelledby="rules-modal-title">
  <HowToPlay />
</Modal>

<Footer />

<style lang="scss">
  .modal-subtitle {
    margin-block-end: var(--space-4);
    color: var(--muted);
  }

  main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
</style>
