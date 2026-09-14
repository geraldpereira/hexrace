import { type ExitFace } from '@hexrace/tile';

import { ExitChoices } from '@track/generation/exit-choices';

export class ScriptedExits {
  budget = 0;
  exits: ExitFace[] = [12];

  ranked(): ExitFace[] {
    return this.budget-- > 0 ? [...this.exits] : [];
  }
}

export function provideScriptedExits(scripted: ScriptedExits): {
  provide: typeof ExitChoices;
  useValue: ExitChoices;
} {
  return { provide: ExitChoices, useValue: scripted as unknown as ExitChoices };
}
