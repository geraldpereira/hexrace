beforeEach(() => {
  localStorage.clear();
  document.body.querySelectorAll(':scope > .lil-gui').forEach((panel) => {
    panel.remove();
  });
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
});
