import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';

import { formatTime } from '@hud/commons/format-time';

/** What the end of a race has to say (functional spec 4.5). */
export interface RaceResult {
  readonly mode: 'track' | 'rally' | 'collapse';
  /** The time, or the time held in Collapse, in ms. */
  readonly timeMs: number;
  readonly record: boolean;
}

export type ResultsChoice = 'retry' | 'home';

/** The results box: the score, the record if one fell, Retry and Home, nothing else. */
@Component({
  selector: 'hr-results-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p class="time">{{ time }}</p>
      @if (result.record) {
        <p class="record"><mat-icon aria-hidden="true">star</mat-icon> new record</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton (click)="choose('home')"><mat-icon>home</mat-icon> Home</button>
      <button matButton="filled" (click)="choose('retry')">
        <mat-icon>replay</mat-icon> Retry
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .time {
      font-size: 2rem;
      line-height: 1.3;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      margin: 0.2rem 0;
    }
    .record {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--hr-accent, #ffaa00);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsDialog {
  readonly result = inject<RaceResult>(MAT_DIALOG_DATA);
  readonly title = this.result.mode === 'collapse' ? 'Collapsed' : 'Finished';
  readonly time = formatTime(this.result.timeMs);

  private readonly ref = inject<MatDialogRef<ResultsDialog, ResultsChoice>>(MatDialogRef);

  choose(choice: ResultsChoice): void {
    this.ref.close(choice);
  }
}
