import { bootstrapApplication } from '@angular/platform-browser';

import { App } from '@ui/app';
import { appConfig } from '@ui/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const pre = document.createElement('pre');
  pre.textContent = `HexRace could not start.\n\n${message}`;
  document.body.replaceChildren(pre);
});
