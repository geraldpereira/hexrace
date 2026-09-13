import { type Type } from '@angular/core';
import { type Routes } from '@angular/router';

import { DebugShowcase } from '@ui/lab/debug/debug-showcase';
import { HudShowcase } from '@ui/lab/hud/hud-showcase';
import { InputsShowcase } from '@ui/lab/inputs/inputs-showcase';
import { LabHome } from '@ui/lab/lab-home';

/** One route per showcase; the 3D ones load lazily, three and Jolt with them. */
export const LAB_ROUTES: Routes = [
  { path: 'lab', component: LabHome },
  { path: 'lab/inputs', component: InputsShowcase },
  { path: 'lab/debug', component: DebugShowcase },
  { path: 'lab/hud', component: HudShowcase },
  {
    path: 'lab/engine',
    loadComponent: () =>
      import('@ui/lab/engine/engine-showcase').then(
        (m: { EngineShowcase: Type<unknown> }) => m.EngineShowcase,
      ),
  },
  {
    path: 'lab/camera',
    loadComponent: () =>
      import('@ui/lab/camera/camera-showcase').then(
        (m: { CameraShowcase: Type<unknown> }) => m.CameraShowcase,
      ),
  },
];
