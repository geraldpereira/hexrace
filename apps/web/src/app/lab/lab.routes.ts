import { type Routes } from '@angular/router';

import { LabHome } from '@ui/lab/lab-home';

/** Une route par vitrine, ajoutée quand le module arrive. */
export const LAB_ROUTES: Routes = [{ path: 'lab', component: LabHome }];
