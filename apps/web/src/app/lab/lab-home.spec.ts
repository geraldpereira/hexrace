import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LabHome } from '@ui/lab/lab-home';
import { SHOWCASES, type Showcase } from '@ui/lab/showcases';

const READY: Showcase = { module: 'inputs', path: 'lab/inputs', summary: 'Prête.', ready: true };
const PENDING: Showcase = {
  module: 'tile',
  path: 'lab/tile',
  summary: 'Pas encore.',
  ready: false,
};

describe('LabHome', () => {
  async function render(showcases: readonly Showcase[]): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [LabHome],
      providers: [provideRouter([]), { provide: SHOWCASES, useValue: showcases }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LabHome);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists one row per showcase', async () => {
    const host = await render([READY, PENDING]);
    expect(host.querySelectorAll('li').length).toBe(2);
  });

  it('links the ready showcase and greys out the one that is not', async () => {
    const host = await render([READY, PENDING]);
    const link = host.querySelector('a');
    expect(link?.textContent).toContain('inputs');
    expect(link?.getAttribute('href')).toBe('/lab/inputs');
    const pending = host.querySelectorAll('li.pending');
    expect(pending.length).toBe(1);
    expect(pending[0]?.querySelector('a')).toBeNull();
  });

  it("offers the plan's showcases by default, the first being inputs", async () => {
    await TestBed.configureTestingModule({
      imports: [LabHome],
      providers: [provideRouter([])],
    }).compileComponents();
    const showcases = TestBed.inject(SHOWCASES);
    expect(showcases.length).toBeGreaterThan(0);
    expect(showcases[0]?.module).toBe('inputs');
  });
});
