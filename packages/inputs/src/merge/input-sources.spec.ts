import { TestBed } from '@angular/core/testing';

import { INPUT_SOURCES } from '@inputs/merge/input-sources';

describe('INPUT_SOURCES', () => {
  it('is empty until someone provides a source', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(INPUT_SOURCES, [])).toEqual([]);
  });
});
