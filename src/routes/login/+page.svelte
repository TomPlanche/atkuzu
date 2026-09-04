<script lang="ts">
  // Kept as a real route (not just a modal) so login still works with JS disabled,
  // via direct link/share, or for crawlers. Renders the same LoginForm as the
  // modal in +layout.svelte, so the two stay in sync automatically.
  import LoginForm from "$lib/components/LoginForm.svelte";
</script>

<section class="login-card">
  <h1>Login</h1>
  <p class="subtitle">Sign in with your AT Protocol handle.</p>
  <LoginForm />
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
</style>
