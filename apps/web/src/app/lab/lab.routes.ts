import { type Routes } from '@angular/router';

import { InputsShowcase } from '@ui/lab/inputs/inputs-showcase';
import { LabHome } from '@ui/lab/lab-home';

/** One route per showcase, added when its module lands. */
export const LAB_ROUTES: Routes = [
  { path: 'lab', component: LabHome },
  { path: 'lab/inputs', component: InputsShowcase },
];
