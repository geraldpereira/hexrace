import { Injectable } from '@angular/core';

/**
 * The knobs of the follow camera (functional spec 3.9), one instance for the game so the debug
 * panel and the race tune the same values. Distances in metres, speeds in m/s, angles in degrees.
 */
@Injectable({ providedIn: 'root' })
export class CameraTuning {
  /** Behind the target, along the heading. */
  distance = 9;
  heightAtRest = 5;
  heightAtSpeed = 11;
  /** The speed at which the height reaches `heightAtSpeed`. */
  speedForFullHeight = 40;
  /** Ahead of the target, where the camera aims. */
  lookAhead = 6;
  /** 0 keeps the target's heading, 1 turns fully towards the next tile. */
  anticipation = 0.35;
  /** The turn towards the next tile never exceeds this, whatever the anticipation. */
  anticipationMaxDeg = 60;
  /** Per second; higher follows tighter. */
  smoothing = 5;
}
