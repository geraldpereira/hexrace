import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { appConfig } from '@ui/app.config';

describe('appConfig', () => {
  it('provides the router', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(Router)).toBeTruthy();
  });
});
