import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { ResultsDialogs } from '@hud/dialog/results-dialogs';

describe('ResultsDialogs', () => {
  it('shows the time and the record, and resolves with the choice', async () => {
    TestBed.configureTestingModule({});
    const dialogs = TestBed.inject(ResultsDialogs);
    const choice = dialogs.open({ mode: 'track', timeMs: 71_234, record: true });
    await new Promise((r) => setTimeout(r, 0));
    const box = document.querySelector('hr-results-dialog')!;
    expect(box.querySelector('h2')?.textContent).toBe('Finished');
    expect(box.querySelector('.time')?.textContent).toBe('1:11.234');
    expect(box.querySelector('.record')).not.toBeNull();
    box.querySelectorAll('button')[1]!.click();
    expect(await choice).toBe('retry');
  });

  it('reads Home when the box is closed any other way', async () => {
    TestBed.configureTestingModule({});
    const choice = TestBed.inject(ResultsDialogs).open({ mode: 'rally', timeMs: 1, record: false });
    await new Promise((r) => setTimeout(r, 0));
    TestBed.inject(MatDialog).closeAll();
    expect(await choice).toBe('home');
  });

  it('titles a collapse differently, and reads Home from the first button', async () => {
    TestBed.configureTestingModule({});
    const dialogs = TestBed.inject(ResultsDialogs);
    const choice = dialogs.open({ mode: 'collapse', timeMs: 30_000, record: false });
    await new Promise((r) => setTimeout(r, 0));
    const box = document.querySelector('hr-results-dialog')!;
    expect(box.querySelector('h2')?.textContent).toBe('Collapsed');
    expect(box.querySelector('.record')).toBeNull();
    box.querySelectorAll('button')[0]!.click();
    expect(await choice).toBe('home');
  });
});
