import { TestBed } from '@angular/core/testing';

import { INPUT_SOURCES } from '@inputs/merge/input-sources';
import { provideInputSources } from '@inputs/merge/provide-input-sources';

describe('provideInputSources', () => {
  it('plugs in the gamepad, the keyboard and the touch screen', () => {
    TestBed.configureTestingModule({ providers: provideInputSources() });
    const ids = TestBed.inject(INPUT_SOURCES).map((s) => s.id);
    expect(ids).toEqual(['gamepad', 'keyboard', 'touch']);
  });
});
