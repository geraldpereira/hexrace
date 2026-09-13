import { TestBed } from '@angular/core/testing';
import { GUI } from 'lil-gui';

import { DebugStore } from '@hud/debug/debug-store';

describe('DebugStore', () => {
  let store: DebugStore;
  let gui: GUI;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(DebugStore);
    gui = new GUI({ autoPlace: false });
  });

  afterEach(() => {
    gui.destroy();
  });

  function build(subject: { a: number; b: boolean; nested: { c: string }; readout: number }): GUI {
    const folder = gui.addFolder('Folder');
    folder.add(subject, 'a', 0, 10);
    folder.add(subject, 'b');
    folder.addFolder('Nested').add(subject.nested, 'c');
    folder.add(subject, 'readout').disable();
    folder.add({ run: () => undefined }, 'run');
    return folder;
  }

  it('saves the tweakable values by path and restores them', () => {
    const first = { a: 1, b: false, nested: { c: 'x' }, readout: 5 };
    const folder = build(first);
    first.a = 7;
    first.nested.c = 'y';
    store.save('Folder', folder);
    expect(JSON.parse(localStorage.getItem('hexrace.debug.Folder') ?? '{}')).toEqual({
      a: 7,
      b: false,
      'Nested/c': 'y',
    });

    const second = { a: 1, b: true, nested: { c: 'x' }, readout: 5 };
    const again = build(second);
    store.restore('Folder', again);
    expect(second.a).toBe(7);
    expect(second.b).toBe(false);
    expect(second.nested.c).toBe('y');
    expect(second.readout).toBe(5);
  });

  it('restores nothing when nothing was saved, and ignores unknown paths', () => {
    const subject = { a: 1, b: false, nested: { c: 'x' }, readout: 5 };
    localStorage.setItem('hexrace.debug.Other', JSON.stringify({ a: 3 }));
    localStorage.setItem('hexrace.debug.Folder', JSON.stringify({ zzz: 3 }));
    store.restore('Folder', build(subject));
    expect(subject.a).toBe(1);
  });

  it('forgets one folder or all of them, and leaves other keys alone', () => {
    localStorage.setItem('hexrace.debug.One', '{}');
    localStorage.setItem('hexrace.debug.Two', '{}');
    localStorage.setItem('other', '1');
    store.forget('One');
    expect(localStorage.getItem('hexrace.debug.One')).toBeNull();
    expect(localStorage.getItem('hexrace.debug.Two')).not.toBeNull();
    store.forgetAll();
    expect(localStorage.getItem('hexrace.debug.Two')).toBeNull();
    expect(localStorage.getItem('other')).toBe('1');
  });
});
