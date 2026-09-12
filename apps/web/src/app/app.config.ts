import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { ROUTES } from '@ui/app.routes';

/** Les providers de l'application. Chaque jeton remplacé pour une plateforme se nomme ici. */
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(ROUTES)],
};
