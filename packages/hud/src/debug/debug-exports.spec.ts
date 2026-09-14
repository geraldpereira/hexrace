import { TestBed } from '@angular/core/testing';
import { GUI } from 'lil-gui';

import { DebugExports } from '@hud/debug/debug-exports';

describe('DebugExports', () => {
  it('lists every tweakable value by folder, against what the code started with', () => {
    const gui = new GUI({ autoPlace: false });
    const subject = { a: 1, deep: { b: 'x' }, readout: 3 };
    gui.add(subject, 'a', 0, 10).name('A');
    const folder = gui.addFolder('Outer').addFolder('Inner');
    folder.add(subject.deep, 'b');
    folder.add(subject, 'readout').disable();
    folder.add({ run: () => undefined }, 'run');
    subject.a = 4;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());

    TestBed.configureTestingModule({});
    const payload = JSON.parse(TestBed.inject(DebugExports).values(gui)) as Record<
      string,
      unknown[]
    >;
    expect(payload['(root)']).toEqual([
      { property: 'a', name: 'A', current: 4, default: 1, changed: true },
    ]);
    expect(payload['Outer > Inner']).toEqual([
      { property: 'b', name: 'b', current: 'x', default: 'x', changed: false },
    ]);
    gui.destroy();
  });
});
