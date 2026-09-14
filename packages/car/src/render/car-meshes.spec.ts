import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { carSpec } from '@car/entity/car.mock';
import { CarMeshes } from '@car/render/car-meshes';

describe('CarMeshes', () => {
  it('builds a body, a cabin, a hidden marker and one wheel each, then frees them', () => {
    const meshes = TestBed.inject(CarMeshes);
    const spec = carSpec();
    const set = meshes.build(spec);
    expect(set.group.children).toHaveLength(7);
    expect(set.marker.visible).toBe(false);
    expect(set.wheels).toHaveLength(4);
    const wheel = set.wheels[0] as THREE.Mesh;
    const disposed = vi.spyOn(wheel.geometry, 'dispose');
    const group = new THREE.Group();
    group.add(new THREE.Object3D());
    meshes.dispose({ ...set, group: set.group });
    expect(disposed).toHaveBeenCalled();
  });
});
