import * as THREE from 'three';

import { type CameraTarget } from '@camera/entity/camera-target';

export class DummyTarget implements CameraTarget {
  position = new THREE.Vector3();
  heading = 0;
  speed = 0;
  nextTile: THREE.Vector3 | null = null;
}
