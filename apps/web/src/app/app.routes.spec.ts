import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ROUTES } from '@ui/app.routes';

describe('ROUTES', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  });

  it.each([
    ['the root is the game, not the lab', '/', '/'],
    ['the track pick screen is its own address', '/tracks', '/tracks'],
    ['the race loads lazily, three and Jolt with it', '/race/europe-ring-01', '/race/europe-ring-01'],
    ['the lab keeps its front page', '/lab', '/lab'],
    ['the engine showcase loads lazily, three and Jolt with it', '/lab/engine', '/lab/engine'],
    ['the camera showcase loads lazily', '/lab/camera', '/lab/camera'],
    ['the tile showcase loads lazily', '/lab/tile', '/lab/tile'],
    ['the track showcase loads lazily', '/lab/track', '/lab/track'],
    ['the car showcase loads lazily', '/lab/car', '/lab/car'],
    ['the race showcase loads lazily', '/lab/race', '/lab/race'],
    ['an unknown address goes back to the game', '/nulle-part', '/'],
  ])('%s', async (_name, from, to) => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(from);
    expect(router.url).toBe(to);
  });
});
