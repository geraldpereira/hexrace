import { TestBed } from '@angular/core/testing';

import { Bar } from '@ui/lab/inputs/bar';

describe('Bar', () => {
  async function render(value: number, signed = false): Promise<{ host: HTMLElement; bar: Bar }> {
    await TestBed.configureTestingModule({ imports: [Bar] }).compileComponents();
    const fixture = TestBed.createComponent(Bar);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('signed', signed);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, bar: fixture.componentInstance };
  }

  it('draws an unsigned value from the left', async () => {
    const { host, bar } = await render(0.25);
    expect(bar.left()).toBe(0);
    expect(bar.width()).toBe(25);
    expect(host.querySelector('span')?.textContent).toBe('0.25');
  });

  it('draws a signed negative value from the middle, leftwards', async () => {
    const { bar } = await render(-0.5, true);
    expect(bar.left()).toBe(25);
    expect(bar.width()).toBe(25);
  });

  it('draws a signed positive value from the middle, rightwards', async () => {
    const { bar } = await render(0.5, true);
    expect(bar.left()).toBe(50);
    expect(bar.width()).toBe(25);
  });
});
