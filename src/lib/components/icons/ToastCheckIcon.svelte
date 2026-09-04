<!-- Replaces svelte-french-toast's default green checkmark circle, which clashed with
     this app's dark palette. Same outlined-stroke style as the icons in Button.svelte. -->
<svg
  fill="none"
  stroke="currentColor"
  stroke-linecap="round"
  stroke-linejoin="round"
  stroke-width="2"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
>
  <path d="M20 6 9 17l-5-5" />
</svg>

<style>
  svg {
    width: 16px;
    height: 16px;
    color: var(--accent);
  }
</style>
