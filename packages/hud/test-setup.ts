vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
}));

beforeEach(() => {
  localStorage.clear();
  document.body.querySelectorAll(':scope > .lil-gui').forEach((panel) => {
    panel.remove();
  });
});
