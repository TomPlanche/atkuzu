<script lang="ts">
  // Fixed to the bottom of the viewport (see .site-footer below) so it's always in the
  // same screen position regardless of how much content a given page has, instead of
  // trailing whatever's above it. That takes it out of normal flow, so the page's actual
  // content needs bottom padding reserved to match, or the footer would just cover it;
  // measuring the real rendered height here avoids guessing a fixed padding value that
  // could under-reserve (overlap) or over-reserve (dead scroll space) on some viewport.
  let footerEl: HTMLElement | undefined = $state();

  $effect(() => {
    const el = footerEl;
    if (!el) {
      return;
    }

    const update = () => {
      document.documentElement.style.setProperty(
        "--footer-height",
        `${el.getBoundingClientRect().height}px`
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  });
</script>

{#snippet tangledMark()}
  <svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21.0971 30.866C20.0566 30.8575 19.2628 30.5542 18.4016 30.0269C17.1668 29.3753 16.2237 28.2808 15.5497 27.0739C14.4789 28.4065 13.0476 29.215 11.4453 29.6718C10.763 29.8705 9.56809 30.0721 7.58737 29.3523C4.73277 28.3905 2.65342 25.4114 2.88973 22.3758C2.8465 21.1175 3.30392 19.8825 3.95228 18.8208C2.22264 17.8897 0.81225 16.3266 0.272148 14.4098C-0.0560731 13.3604 -0.042271 12.2299 0.0787626 11.1512C0.512215 8.60429 2.41697 6.38956 4.86912 5.59294C5.8479 3.35574 7.98378 1.68743 10.4037 1.34778C12.0104 1.12338 13.6735 1.46075 15.0792 2.27979C17.1272 0.00158595 20.6952 -0.671697 23.4195 0.727793C25.4978 1.72322 26.9839 3.80003 27.3447 6.06471C29.3222 6.85928 30.9877 8.47971 31.6413 10.5368C32.0784 11.8104 32.0928 13.2132 31.8098 14.5209C31.3041 16.5615 29.8679 18.2987 28.009 19.2482C28.0135 19.6113 29.2037 22.2296 29.0047 24.2056C28.9612 26.676 27.399 29.0172 25.2325 30.1544C23.9683 30.8945 22.4702 30.8805 21.0971 30.866ZM15.1733 23.755C16.9256 23.5593 18.0743 22.0269 18.9665 20.6469C19.3883 20.0182 19.7105 19.3146 20.0306 18.6454C20.4458 19.0271 20.7975 19.7461 21.4541 19.9173C22.1457 20.1333 22.9566 19.9579 23.38 19.3277C24.1902 17.8118 23.7908 15.9827 23.319 14.4119C23.0284 13.5097 22.6472 12.5841 21.9218 11.9446C22.0765 10.85 21.4299 9.73834 20.5106 9.16542C19.7272 9.79198 18.5352 9.78821 17.7794 9.11795C16.3309 10.5997 15.0034 10.5505 13.7212 9.37618C13.4331 9.11226 12.8832 10.9871 10.9535 9.92506C9.84488 10.8567 8.98526 11.753 8.22356 13.0435C7.48342 14.4347 6.70829 15.6703 6.64151 17.1811C6.6094 18.0641 7.29731 18.9892 8.22942 18.9174C9.16105 19.0009 9.7952 18.0813 10.5006 17.6993C10.6058 18.9316 10.7243 20.2556 11.1395 21.4587C11.6161 23.0155 13.2947 24.005 14.8835 23.7784C14.9959 23.7696 15.1733 23.7549 15.1733 23.755ZM16.0828 19.1062C15.2306 18.5823 15.6407 17.4452 15.6066 16.6193C15.6914 15.6227 15.7594 14.575 16.2061 13.667C16.6788 13.0197 17.8318 13.2694 17.8827 14.0999C17.8488 14.9353 17.4664 15.767 17.5121 16.633C17.4129 17.3561 17.5839 18.1684 17.265 18.8293C17.0033 19.195 16.4703 19.3013 16.0828 19.1062ZM12.3606 18.6302C11.5578 18.1933 11.8129 17.0941 11.687 16.3298C11.7914 15.445 11.7045 14.3226 12.4431 13.7021C13.1653 13.1969 14.1485 14.0621 13.8069 14.8564C13.4426 15.8602 13.6814 16.957 13.6891 17.9748C13.5512 18.5752 12.911 18.894 12.3606 18.6302Z"
    />
  </svg>
{/snippet}

<footer class="site-footer" bind:this={footerEl}>
  <div class="container site-footer__inner">
    <span>
      Made by <a href="https://tomplanche.com">Tom Planche</a>.
    </span>
    <div class="site-footer__links">
      <a href="https://tangled.org/tomplanche.com/atkuzu/issues/new">Report an issue</a>
      <a class="tangled-link" href="https://tangled.org/tomplanche.com/ATKuzu">
        Source
        <span class="tangled-link__mark">{@render tangledMark()}</span>
      </a>
    </div>
  </div>
</footer>

<style lang="scss">
  .site-footer {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    border-top: 1px solid var(--border);
    background: color-mix(in oklab, var(--bg) 75%, transparent);
    backdrop-filter: blur(8px);

    &__inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      row-gap: var(--space-2);
      column-gap: var(--space-3);
      padding-block-start: var(--space-4);
      // The floating bottom toolbar on iOS Safari sits over content that runs flush to the
      // viewport edge; env(safe-area-inset-bottom) is 0 on browsers that don't need it.
      padding-block-end: max(var(--space-4), env(safe-area-inset-bottom));
      font-size: 0.8rem;
      color: var(--muted);

      @media (min-width: 640px) {
        column-gap: var(--space-4);
        font-size: 1rem;
      }
    }
  }

  // Stops each phrase from breaking mid-word on a narrow screen: with this and the reduced
  // gap/font-size above, everything fits on the footer's one line down to a normal phone width.
  .site-footer__inner > * {
    white-space: nowrap;
  }

  .site-footer__links {
    display: flex;
    align-items: center;
    gap: var(--space-3);

    @media (min-width: 640px) {
      gap: var(--space-6);
    }
  }

  .tangled-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);

    &__mark {
      display: inline-flex;
      width: 1em;
      height: 1em;

      :global(svg) {
        width: 100%;
        height: 100%;
      }
    }
  }
</style>
