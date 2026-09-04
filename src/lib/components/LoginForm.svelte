<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import HandleInput from "$lib/components/HandleInput.svelte";
  import Button from "$lib/components/Button.svelte";

  let handle = $state("");
  let error = $state<string | null>(null);
  let submitting = $state(false);

  const handleSubmit: SubmitFunction = () => {
    submitting = true;
    error = null;

    return async ({ result }) => {
      submitting = false;

      if (result.type === "failure") {
        error = (result.data?.error as string | undefined) ?? "Something went wrong.";
        return;
      }

      if (result.type === "error") {
        error = result.error?.message ?? "Something went wrong.";
        return;
      }

      if (result.type === "redirect") {
        window.location.href = result.location;
      }
    };
  };
</script>

<form action="/login" method="POST" use:enhance={handleSubmit}>
  <label class="sr-only" for="handle">Handle</label>
  <div class="login-form">
    <HandleInput bind:value={handle} id="handle" placeholder="yourhandle.bsky.social" required />

    <Button aria-disabled={submitting} type="submit">Continue</Button>
  </div>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</form>

<style lang="scss">
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  // Kept for accessibility (associates the input with a name for screen readers);
  // hidden visually since the subtitle above already says "handle" and the
  // input's placeholder shows the expected format.
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .login-form {
    display: flex;
    align-items: stretch;
    gap: var(--space-2);

    :global(.handle-input) {
      flex: 1;
    }

    :global(.btn) {
      flex-shrink: 0;
      height: auto;
    }
  }

  .error {
    margin: 0;
    color: var(--danger);
  }
</style>
