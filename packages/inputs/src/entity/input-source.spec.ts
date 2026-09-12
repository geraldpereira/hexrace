import { TestBed } from '@angular/core/testing';

import { INPUT_SOURCES } from '@inputs/entity/input-source';

describe('INPUT_SOURCES', () => {
  it('is empty when nothing provides it', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(INPUT_SOURCES, [])).toEqual([]);
  });
});
