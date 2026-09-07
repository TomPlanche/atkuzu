<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    open: boolean;
    labelledby?: string;
    onclose?: () => void;
    children: Snippet;
  };

  let { open = $bindable(false), labelledby, onclose, children }: Props = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  const close = () => {
    open = false;
  };

  const onDialogClose = () => {
    open = false;
    onclose?.();
  };

  const onDialogClick = (event: MouseEvent) => {
    if (event.target === dialogEl) {
      close();
    }
  };

  $effect(() => {
    if (!dialogEl) {
      return;
    }

    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });
</script>

<dialog
  aria-labelledby={labelledby}
  bind:this={dialogEl}
  class="modal"
  onclick={onDialogClick}
  onclose={onDialogClose}
>
  <div class="modal__panel">
    <button aria-label="Close" class="modal__close" onclick={close} type="button">&times;</button>

    {@render children()}
  </div>
</dialog>

<style lang="scss">
  .modal {
    padding: 0;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    width: 100%;
    max-width: min(45rem, calc(100vw - 2rem));
    max-height: calc(100vh - 4rem);
    overflow-y: auto;

    &::backdrop {
      background: color-mix(in oklab, black 60%, transparent);
      backdrop-filter: blur(2px);
    }
  }

  .modal__panel {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-8);
  }

  .modal__close {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--surface-hover);
      color: var(--fg);
    }
  }
</style>
