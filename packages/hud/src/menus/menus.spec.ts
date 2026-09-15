import { inputBinding, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';

import { INPUT_SOURCES } from '@hexrace/inputs';

import { MenuGridHost } from '@hud/menus/menu-grid.mock';
import { type MenuItem, MenuList } from '@hud/menus/menu-list';
import { MenuSource } from '@hud/menus/menu-source.mock';

const ITEMS: readonly MenuItem[] = [
  { id: 'race', label: 'Race', icon: 'flag' },
  { id: 'garage', label: 'Garage' },
  { id: 'options', label: 'Options' },
];

describe('menus', () => {
  let frames: FrameRequestCallback[];
  let now: number;
  let source: MenuSource;

  beforeEach(() => {
    frames = [];
    now = 0;
    source = new MenuSource();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: INPUT_SOURCES, useValue: source, multi: true }],
    });
  });

  function tick(ms = 16): void {
    now += ms;
    for (const frame of frames.splice(0)) frame(now);
    TestBed.tick();
  }

  async function list(items: readonly MenuItem[] = ITEMS): Promise<{
    host: HTMLElement;
    menu: MenuList;
    chosen: string[];
    cancelled: number;
  }> {
    await TestBed.configureTestingModule({ imports: [MenuList] }).compileComponents();
    const rows: WritableSignal<readonly MenuItem[]> = signal(items);
    const fixture = TestBed.createComponent(MenuList, {
      bindings: [inputBinding('items', rows)],
    });
    await fixture.whenStable();
    const chosen: string[] = [];
    const seen = { count: 0 };
    fixture.componentInstance.chosen.subscribe((id: string) => chosen.push(id));
    fixture.componentInstance.cancelled.subscribe(() => (seen.count += 1));
    return {
      host: fixture.nativeElement as HTMLElement,
      menu: fixture.componentInstance,
      chosen,
      get cancelled(): number {
        return seen.count;
      },
    };
  }

  async function grid(): Promise<ComponentFixture<MenuGridHost>> {
    await TestBed.configureTestingModule({ imports: [MenuGridHost] }).compileComponents();
    const fixture = TestBed.createComponent(MenuGridHost);
    await fixture.whenStable();
    return fixture;
  }

  function buttons(host: HTMLElement): HTMLButtonElement[] {
    return [...host.querySelectorAll('button')];
  }

  it('draws a row per item, with the icon when there is one, and picks the first', async () => {
    const { host } = await list();
    expect(buttons(host).map((b) => b.querySelector('span')?.textContent)).toEqual([
      'Race',
      'Garage',
      'Options',
    ]);
    expect(host.querySelectorAll('mat-icon').length).toBe(1);
    expect(buttons(host)[0]?.classList.contains('picked')).toBe(true);
  });

  it('ignores an action already held when the menu opens, and reads it once released', async () => {
    const { host, chosen } = await list();
    source.actions.confirm = 1;
    tick();
    tick();
    expect(chosen).toEqual([]);
    source.actions.confirm = 0;
    tick();
    source.actions.confirm = 1;
    tick();
    expect(chosen).toEqual(['race']);
    tick();
    expect(chosen).toEqual(['race']);
    expect(buttons(host)[0]?.classList.contains('picked')).toBe(true);
  });

  it('walks down and wraps around, one step per crossing then a repeat while it is held', async () => {
    const { menu } = await list();
    tick();
    source.actions.navigateY = 1;
    tick();
    expect(menu.index()).toBe(1);
    tick(100);
    tick(100);
    tick(100);
    expect(menu.index()).toBe(1);
    tick(100);
    tick(100);
    expect(menu.index()).toBe(2);
    tick(100);
    tick(100);
    expect(menu.index()).toBe(0);
    source.actions.navigateY = -1;
    tick();
    expect(menu.index()).toBe(2);
  });

  it('stays still inside the dead zone', async () => {
    const { menu } = await list();
    tick();
    source.actions.navigateY = 0.4;
    tick();
    expect(menu.index()).toBe(0);
  });

  it('gives up on back, and answers nothing at all when there is no row', async () => {
    const menu = await list([]);
    tick();
    source.actions.back = 1;
    tick();
    expect(menu.cancelled).toBe(1);
    source.actions.back = 0;
    source.actions.confirm = 1;
    source.actions.navigateY = 1;
    tick();
    expect(menu.chosen).toEqual([]);
    expect(menu.menu.index()).toBe(0);
  });

  it('picks a row under the pointer and takes it on a click', async () => {
    const { host, menu, chosen } = await list();
    buttons(host)[2]?.dispatchEvent(new Event('pointerenter'));
    TestBed.tick();
    expect(menu.index()).toBe(2);
    expect(buttons(host)[2]?.classList.contains('picked')).toBe(true);
    buttons(host)[0]?.dispatchEvent(new Event('focus'));
    TestBed.tick();
    expect(menu.index()).toBe(0);
    buttons(host)[1]?.click();
    expect(chosen).toEqual(['garage']);
    expect(menu.index()).toBe(1);
  });

  it('rings the cell it is on, walks the grid by columns and stops at its corners', async () => {
    const fixture = await grid();
    const host = fixture.nativeElement as HTMLElement;
    const cells = (): HTMLElement[] => [...host.querySelectorAll('article')];
    const ringed = (): number => cells().findIndex((c) => c.classList.contains('hr-menu-picked'));
    tick();
    expect(ringed()).toBe(0);
    source.actions.navigateX = 1;
    tick();
    expect(ringed()).toBe(1);
    tick(600);
    expect(ringed()).toBe(1);
    source.actions.navigateX = 0;
    source.actions.navigateY = 1;
    tick();
    expect(ringed()).toBe(3);
    source.actions.navigateY = 0;
    tick();
    source.actions.navigateY = 1;
    tick();
    expect(ringed()).toBe(3);
  });

  it('answers with the cell on confirm, gives up on back, and lays the columns out', async () => {
    const fixture = await grid();
    const host = fixture.nativeElement as HTMLElement;
    const element = host.querySelector<HTMLElement>('hr-menu-grid')!;
    expect(element.style.gridTemplateColumns).toBe('repeat(2, max-content)');
    tick();
    source.actions.confirm = 1;
    tick();
    expect(fixture.componentInstance.picked()).toBe(0);
    source.actions.confirm = 0;
    source.actions.back = 1;
    tick();
    expect(fixture.componentInstance.gaveUp()).toBe(true);
  });

  it('picks the cell under the pointer, takes it on a click, and ignores what is not a cell', async () => {
    const fixture = await grid();
    const host = fixture.nativeElement as HTMLElement;
    const cells = [...host.querySelectorAll('article')];
    cells[2]?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    cells[2]?.dispatchEvent(new PointerEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.picked()).toBe(2);
    const element = host.querySelector<HTMLElement>('hr-menu-grid')!;
    element.dispatchEvent(new PointerEvent('pointerover'));
    element.dispatchEvent(new PointerEvent('click'));
    expect(fixture.componentInstance.picked()).toBe(2);
  });

  it('walks nothing and answers nothing when the grid is empty', async () => {
    const fixture = await grid();
    fixture.componentInstance.cells.set([]);
    await fixture.whenStable();
    tick();
    source.actions.navigateX = 1;
    source.actions.confirm = 1;
    tick();
    expect(fixture.componentInstance.picked()).toBe(-1);
  });
});
