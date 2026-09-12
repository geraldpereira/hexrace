import { TestBed } from '@angular/core/testing';

import { Bar } from '@ui/lab/inputs/bar';

describe('Bar', () => {
  async function render(value: number): Promise<{ host: HTMLElement; bar: Bar }> {
    await TestBed.configureTestingModule({ imports: [Bar] }).compileComponents();
    const fixture = TestBed.createComponent(Bar);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, bar: fixture.componentInstance };
  }

  it('draws a positive value from the left', async () => {
    const { host, bar } = await render(0.25);
    expect(bar.signed()).toBe(false);
    expect(bar.left()).toBe(0);
    expect(bar.width()).toBe(25);
    expect(host.querySelector('span')?.textContent).toBe('0.25');
  });

  it('draws a negative value from the middle, leftwards', async () => {
    const { bar } = await render(-0.5);
    expect(bar.signed()).toBe(true);
    expect(bar.left()).toBe(25);
    expect(bar.width()).toBe(25);
  });
});
