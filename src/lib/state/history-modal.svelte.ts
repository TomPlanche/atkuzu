let open = $state(false);

export const historyModal = {
  get open() {
    return open;
  },
  set open(value: boolean) {
    open = value;
  },
  show() {
    open = true;
  },
  hide() {
    open = false;
  }
};
