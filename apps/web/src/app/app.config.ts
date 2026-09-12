import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideInputSources } from '@hexrace/inputs';

import { ROUTES } from '@ui/app.routes';

/** The application's providers: every token given a platform implementation is named here. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(ROUTES),
    ...provideInputSources(),
  ],
};
