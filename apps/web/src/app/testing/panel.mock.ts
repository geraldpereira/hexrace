export function panelRow(name: string): Element {
  const rows = [...document.querySelectorAll('.lil-controller')];
  return rows.find((r) => r.querySelector('.lil-name')?.textContent === name)!;
}

export function panelButton(name: string): HTMLButtonElement {
  return panelRow(name).querySelector('button')!;
}
