import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ROUTES } from '@ui/app.routes';

describe('ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  });

  it('leads the root to the lab while there is no game', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/lab');
  });

  it('sends an unknown address back to the lab', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/nulle-part');
    expect(router.url).toBe('/lab');
  });
});
