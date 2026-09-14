export function panelRow(name: string): Element {
  const rows = [...document.querySelectorAll('.lil-controller')];
  return rows.find((r) => r.querySelector('.lil-name')?.textContent === name)!;
}

export function panelButton(name: string): HTMLButtonElement {
  return panelRow(name).querySelector('button')!;
}

export function panelInput(name: string, value: string): void {
  const input = panelRow(name).querySelector('input')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function panelSelect(name: string, value: string): void {
  const select = panelRow(name).querySelector('select')!;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
