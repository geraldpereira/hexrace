import { TestBed } from '@angular/core/testing';
import { GameObject } from '@hexrace/engine';
import * as THREE from 'three';

import { type FadingTile, FADE_SECONDS, TileFader } from '@game-commons/stage/tile-fader';

describe('TileFader', () => {
  let fader: TileFader;
  let group: THREE.Group;
  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
  let line: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fader = TestBed.inject(TileFader);
    mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial());
    line = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
    group = new THREE.Group();
    group.add(mesh, line);
  });

  function tile(opacity: number, target: number): FadingTile {
    return { object: GameObject.named('tile'), drawn: group, opacity, target };
  }

  it('paints every material under what it is given, and drops transparency at full', () => {
    fader.paint(group, 0.25);
    expect(mesh.material.opacity).toBe(0.25);
    expect(mesh.material.transparent).toBe(true);
    expect(line.material.opacity).toBe(0.25);
    expect(line.material.transparent).toBe(true);
    fader.paint(group, 1);
    expect(mesh.material.transparent).toBe(false);
    expect(mesh.material.opacity).toBe(1);
  });

  it('paints a mesh that carries several materials, and ignores what carries none', () => {
    const many = new THREE.Mesh(new THREE.BufferGeometry(), [
      new THREE.MeshLambertMaterial(),
      new THREE.MeshLambertMaterial(),
    ]);
    group.add(many);
    fader.paint(group, 0.5);
    expect(many.material.map((one: THREE.Material) => one.opacity)).toEqual([0.5, 0.5]);
  });

  it('brings a tile up to full in the fade time and says nothing while it is there', () => {
    const one = tile(0, 1);
    expect(fader.advance(one, FADE_SECONDS / 2)).toBe(false);
    expect(one.opacity).toBeCloseTo(0.5, 9);
    expect(fader.advance(one, FADE_SECONDS / 2)).toBe(false);
    expect(one.opacity).toBe(1);
    expect(mesh.material.transparent).toBe(false);
    expect(fader.advance(one, FADE_SECONDS)).toBe(false);
    expect(one.opacity).toBe(1);
  });

  it('takes a tile down the other way and says so once it has gone', () => {
    const one = tile(1, 0);
    expect(fader.advance(one, FADE_SECONDS / 2)).toBe(false);
    expect(one.opacity).toBeCloseTo(0.5, 9);
    expect(fader.advance(one, FADE_SECONDS)).toBe(true);
    expect(one.opacity).toBe(0);
  });
});
