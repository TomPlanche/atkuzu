<script lang="ts">
  import type { PageProps } from "./$types";
  import { enhance } from "$app/forms";
  import HandleInput from "$lib/components/HandleInput.svelte";
  import Button from "$lib/components/Button.svelte";

  let { form }: PageProps = $props();

  let handle = $state("");
</script>

<section class="login-card">
  <h1>Login</h1>
  <p class="subtitle">Sign in with your AT Protocol handle.</p>

  <form action="/login" method="POST" use:enhance>
    <label for="handle">Handle</label>
    <div class="login-form">
      <HandleInput bind:value={handle} id="handle" required placeholder="jcsalterego.bsky.social" />
      <Button type="submit">Continue</Button>
    </div>
    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
  </form>
</section>

<style lang="scss">
  .login-card {
    max-width: 28rem;
    margin-inline: auto;
    padding-block: var(--space-12);
  }

  .subtitle {
    color: var(--muted);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }

  .login-form {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);

    :global(.handle-input) {
      flex: 1;
    }

    :global(.btn) {
      flex-shrink: 0;
    }
  }

  .error {
    margin: 0;
    color: var(--danger);
  }
</style>
