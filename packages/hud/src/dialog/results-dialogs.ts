import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { type RaceResult, ResultsDialog, type ResultsChoice } from '@hud/dialog/results-dialog';

/** Opens the results box and resolves with what the player chose; closing it any other way is Home. */
@Injectable({ providedIn: 'root' })
export class ResultsDialogs {
  private readonly dialog = inject(MatDialog);

  async open(result: RaceResult): Promise<ResultsChoice> {
    const ref = this.dialog.open<ResultsDialog, RaceResult, ResultsChoice>(ResultsDialog, {
      data: result,
      disableClose: true,
    });
    return (await firstValueFrom(ref.afterClosed())) ?? 'home';
  }
}
