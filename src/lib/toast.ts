// Shared per-type toast styling. svelte-french-toast's <Toaster toastOptions> only merges
// `style` correctly (core/store.js concatenates it); `icon`/`iconTheme` set there get
// clobbered by the toast's own (undefined) fields when spread back on top. So those must
// be passed at each toast(...) call site instead. These presets are that per-call payload.
import type { ToastOptions } from "svelte-french-toast";
import ToastCheckIcon from "$lib/components/icons/ToastCheckIcon.svelte";
import ToastErrorIcon from "$lib/components/icons/ToastErrorIcon.svelte";

const tint = (color: string): string =>
  `border-color: ${color}; background: color-mix(in oklab, ${color} 16%, var(--surface));`;

export const toastSuccessOptions: ToastOptions = {
  icon: ToastCheckIcon,
  style: tint("var(--accent)")
};

export const toastErrorOptions: ToastOptions = {
  icon: ToastErrorIcon,
  style: tint("var(--danger)")
};

export const toastLoadingOptions: ToastOptions = {
  iconTheme: { primary: "var(--accent)", secondary: "var(--border)" }
};
