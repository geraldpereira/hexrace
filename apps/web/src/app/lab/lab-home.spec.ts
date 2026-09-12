import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LabHome } from '@ui/lab/lab-home';
import { SHOWCASES, type Showcase } from '@ui/lab/showcases';

const READY: Showcase = { module: 'inputs', path: 'lab/inputs', summary: 'Prête.', ready: true };
const PENDING: Showcase = { module: 'tile', path: 'lab/tile', summary: 'Pas encore.', ready: false };

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

  it('liste une ligne par vitrine', async () => {
    const host = await render([READY, PENDING]);
    expect(host.querySelectorAll('li').length).toBe(2);
  });

  it('fait un lien de la vitrine prête et grise celle qui ne le sait pas encore', async () => {
    const host = await render([READY, PENDING]);
    const link = host.querySelector('a');
    expect(link?.textContent).toContain('inputs');
    expect(link?.getAttribute('href')).toBe('/lab/inputs');
    const pending = host.querySelectorAll('li.pending');
    expect(pending.length).toBe(1);
    expect(pending[0]?.querySelector('a')).toBeNull();
  });

  it('propose par défaut les vitrines du plan, toutes en attente', async () => {
    await TestBed.configureTestingModule({
      imports: [LabHome],
      providers: [provideRouter([])],
    }).compileComponents();
    const showcases = TestBed.inject(SHOWCASES);
    expect(showcases.length).toBeGreaterThan(0);
    expect(showcases[0]?.module).toBe('inputs');
  });
});
