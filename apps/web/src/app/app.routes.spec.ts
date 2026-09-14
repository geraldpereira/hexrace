import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ROUTES } from '@ui/app.routes';

describe('ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  });

  it.each([
    ['the root leads to the lab while there is no game', '/', '/lab'],
    ['the engine showcase loads lazily, three and Jolt with it', '/lab/engine', '/lab/engine'],
    ['the camera showcase loads lazily', '/lab/camera', '/lab/camera'],
    ['the tile showcase loads lazily', '/lab/tile', '/lab/tile'],
    ['the track showcase loads lazily', '/lab/track', '/lab/track'],
    ['the car showcase loads lazily', '/lab/car', '/lab/car'],
    ['the race showcase loads lazily', '/lab/race', '/lab/race'],
    ['an unknown address goes back to the lab', '/nulle-part', '/lab'],
  ])('%s', async (_name, from, to) => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(from);
    expect(router.url).toBe(to);
  });
});
