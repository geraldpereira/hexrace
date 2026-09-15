import { Injectable } from '@angular/core';
import { type GameObject } from '@hexrace/engine';
import { clamp } from 'lodash-es';
import type * as THREE from 'three';

/** How long a tile takes to appear when it enters the window, and to go when it leaves, in seconds. */
export const FADE_SECONDS = 0.4;

/** A tile of the window while it fades: what carries it, what is drawn, and where it stands. */
export interface FadingTile {
  readonly object: GameObject;
  readonly drawn: THREE.Object3D;
  opacity: number;
  /** 1 while the tile belongs to the window, 0 once it has left it. */
  target: number;
}

/** Whatever carries a material, which `THREE.Object3D` alone does not promise. */
interface Painted {
  readonly material: THREE.Material | THREE.Material[];
}

/**
 * The fade of the tiles of the window (functional spec 9.2): one that enters rises from nothing to
 * full in `seconds`, one that leaves goes the other way and is only then dropped, and one that comes
 * back turns round where it stands. It keeps no tile of its own, so a single instance serves every
 * stage: the caller owns the list and hands one tile at a time.
 */
@Injectable({ providedIn: 'root' })
export class TileFader {
  seconds = FADE_SECONDS;

  /** Moves a tile towards its target and paints it; true once one on its way out has gone. */
  advance(tile: FadingTile, dt: number): boolean {
    const step = (dt / this.seconds) * (tile.target === 0 ? -1 : 1);
    tile.opacity = clamp(tile.opacity + step, 0, 1);
    this.paint(tile.drawn, tile.opacity);
    return tile.target === 0 && tile.opacity === 0;
  }

  /** Puts an opacity on every material of an object; a full one drops transparency again. */
  paint(drawn: THREE.Object3D, opacity: number): void {
    const transparent = opacity < 1;
    drawn.traverse((child: THREE.Object3D) => {
      for (const material of this.materialsOf(child)) {
        if (material.transparent !== transparent) material.needsUpdate = true;
        material.transparent = transparent;
        material.opacity = opacity;
      }
    });
  }

  private materialsOf(child: THREE.Object3D): THREE.Material[] {
    const material = (child as Partial<Painted>).material;
    return material ? [material].flat() : [];
  }
}
