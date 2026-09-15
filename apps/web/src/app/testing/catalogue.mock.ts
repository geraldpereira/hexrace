import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { type Catalogue } from '@ui/game/catalogue';

const MOCK_LOOP_FILE = `hexrace-track 1

id: mock-loop-01
name: Mock Loop
environment: europe
mode: track
laps: 2

[tiles]
start  exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=1/1/1
`;

const MOCK_LINE_FILE = `hexrace-track 1

id: mock-line-01
name: Mock Line
environment: europe
mode: rally

[tiles]
start  exit=12  pos=2  w=3  sh=1,1  h=20  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=24  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=28  t=1/1/1
`;

const MOCK_REFUSED_FILE = `hexrace-track 1

id: mock-refused-01
name: Mock Refused
environment: europe
mode: track

[tiles]
start  exit=12  pos=2  w=3  sh=1,1  h=20  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=24  t=1/1/1
`;

export const MOCK_CATALOGUE: Catalogue = {
  countries: [
    {
      id: 'testland',
      name: 'Testland',
      environment: 'europe',
      modes: {
        track: {
          random: {
            dials: { turning: 5, sharpness: 2, relief: 4, variety: 4, obstacles: 3 },
            length: 12,
          },
          tracks: [
            { id: 'mock-loop', name: 'Mock Loop', file: 'tracks/mock-loop.track' },
            { id: 'mock-refused', name: 'Mock Refused', file: 'tracks/mock-refused.track' },
          ],
        },
        rally: {
          random: {
            dials: { turning: 6, sharpness: 3, relief: 5, variety: 4, obstacles: 3 },
            length: 10,
          },
          tracks: [
            { id: 'mock-line', name: 'Mock Line', file: 'tracks/mock-line.track' },
            { id: 'mock-broken', name: 'Mock Broken', file: 'tracks/mock-broken.track' },
          ],
        },
      },
    },
    {
      id: 'loopless',
      name: 'Loopless',
      environment: 'africa',
      modes: {
        rally: {
          random: {
            dials: { turning: 4, sharpness: 2, relief: 4, variety: 4, obstacles: 2 },
            length: 8,
          },
          tracks: [],
        },
      },
    },
  ],
};

const MOCK_TRACK_FILES: Readonly<Record<string, string>> = {
  'tracks/mock-loop.track': MOCK_LOOP_FILE,
  'tracks/mock-line.track': MOCK_LINE_FILE,
  'tracks/mock-refused.track': MOCK_REFUSED_FILE,
  'tracks/mock-broken.track': 'this is not a track file',
};

export const CATALOGUE_URL = 'tracks/catalogue.json';

export async function serveCatalogue(catalogue: Catalogue | null = MOCK_CATALOGUE): Promise<void> {
  const http = TestBed.inject(HttpTestingController);
  for (let round = 0; round < 6; round++) {
    for (const open of http.match(() => true)) {
      const url = open.request.url;
      if (url === CATALOGUE_URL && catalogue !== null) open.flush(catalogue);
      else if (MOCK_TRACK_FILES[url] !== undefined) open.flush(MOCK_TRACK_FILES[url]);
      else open.flush('nothing here', { status: 404, statusText: 'Not Found' });
    }
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }
}
