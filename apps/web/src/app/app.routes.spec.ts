import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ROUTES } from '@ui/app.routes';

describe('ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  });

  it('mène la racine au lab tant que le jeu n’existe pas', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/lab');
  });

  it('renvoie une adresse inconnue au lab', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/nulle-part');
    expect(router.url).toBe('/lab');
  });
});
