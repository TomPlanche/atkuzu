<script lang="ts">
  import type { Snippet } from "svelte";
  import { toasterHostRef } from "$lib/state/toaster-host.svelte";

  type Props = {
    open: boolean;
    labelledby?: string;
    onclose?: () => void;
    /** Caps the modal to a narrower width, for content that doesn't need the default
     *  form/text-sized box (e.g. a calendar). */
    compact?: boolean;
    children: Snippet;
  };

  let { open = $bindable(false), labelledby, onclose, compact = false, children }: Props = $props();

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

    // Move the app's single <Toaster> host in and out of this dialog while it's open, so
    // toasts fired during that time render above it (see toaster-host.svelte.ts): a modal
    // <dialog> paints above a plain top-layer popover regardless of z-index or show order,
    // so becoming a DOM descendant of the dialog is the only way to win that stacking.
    const host = toasterHostRef.el;
    if (!host) {
      return;
    }

    if (open) {
      // dialogEl's own template children (.modal__panel) are static, so appending this
      // extra node alongside them doesn't fight Svelte's reconciliation.
      // eslint-disable-next-line svelte/no-dom-manipulating
      dialogEl.appendChild(host);
    } else if (host.parentElement === dialogEl) {
      document.body.appendChild(host);
    }
  });
</script>

<dialog
  aria-labelledby={labelledby}
  bind:this={dialogEl}
  class="modal"
  class:modal--compact={compact}
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
    // svh accounts for Safari on iOS's collapsing toolbar without dvh's live reflow as
    // that toolbar animates (see _base.scss); vh is the fallback for browsers that don't
    // support svh.
    max-height: calc(100vh - 4rem);
    max-height: calc(100svh - 4rem);
    overflow-y: auto;

    &--compact {
      max-width: min(24rem, calc(100vw - 2rem));
    }

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
