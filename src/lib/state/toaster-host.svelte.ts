// Lets Modal.svelte portal the app's single <Toaster> host into whichever <dialog> is
// currently open. A modal <dialog> shown via showModal() always paints above a plain
// top-layer popover, regardless of which was shown more recently (confirmed empirically:
// this isn't just a z-index issue, no CSS-only fix exists), so the only reliable way for
// a toast to visually render above an open modal is to become a DOM descendant of that
// dialog, not a sibling competing for top-layer stacking.

let el = $state<HTMLElement>();

export const toasterHostRef = {
  get el() {
    return el;
  },
  set(value: HTMLElement | undefined) {
    el = value;
  }
};
