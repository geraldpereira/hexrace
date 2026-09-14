import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { BodyComponent } from '@engine/components/body-component';
import { CameraComponent } from '@engine/components/camera-component';
import { LightComponent } from '@engine/components/light-component';
import { MeshComponent } from '@engine/components/mesh-component';
import { GameLoop } from '@engine/loop/game-loop';
import { JoltPhysics, LAYER_MOVING, type JoltBody } from '@engine/physics/jolt-physics';
import { ThreeRenderer } from '@engine/render/three-renderer';
import { type Component } from '@engine/scene/component';
import { GameObject } from '@engine/scene/game-object';
import { Scenes } from '@engine/scene/scenes';

describe('components', () => {
  let renderer: ThreeRenderer;
  let spawn: <T extends Component>(ctor: new () => T) => T;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    renderer = TestBed.inject(ThreeRenderer);
    const scene = TestBed.inject(Scenes).create();
    spawn = <T extends Component>(ctor: new () => T): T => scene.instantiate(ctor);
  });

  it('MeshComponent puts its object in the scene and takes it out', () => {
    const mesh = spawn(MeshComponent);
    mesh.object = new THREE.Mesh();
    const go = GameObject.named('box');
    go.add(mesh);
    expect(renderer.scene.children).toEqual([mesh.object]);
    go.destroy();
    expect(renderer.scene.children).toEqual([]);
  });

  it('LightComponent adds the sun, its target and the ambient', () => {
    const light = spawn(LightComponent);
    const go = GameObject.named('sun');
    go.add(light);
    expect(renderer.scene.children).toHaveLength(3);
    expect(light.sun.castShadow).toBe(true);
    go.destroy();
    expect(renderer.scene.children).toEqual([]);
  });

  it('CameraComponent keeps the aspect from a size', () => {
    const camera = spawn(CameraComponent);
    camera.setAspect(400, 200);
    expect(camera.camera.aspect).toBe(2);
    camera.setAspect(400, 0);
    expect(camera.camera.aspect).toBe(400);
  });

  describe('BodyComponent', () => {
    let physics: JoltPhysics;
    let go: GameObject;
    let body: BodyComponent;

    beforeEach(async () => {
      physics = TestBed.inject(JoltPhysics);
      await physics.load();
      body = spawn(BodyComponent);
      body.body = crateAt(10);
      go = GameObject.named('crate');
    });

    function crateAt(y: number): JoltBody {
      const Jolt = physics.Jolt;
      const settings = new Jolt.BodyCreationSettings(
        new Jolt.BoxShape(new Jolt.Vec3(0.5, 0.5, 0.5)),
        new Jolt.RVec3(0, y, 0),
        Jolt.Quat.prototype.sIdentity(),
        Jolt.EMotionType_Dynamic,
        LAYER_MOVING,
      );
      const created = physics.bodyInterface.CreateBody(settings);
      Jolt.destroy(settings);
      physics.bodyInterface.AddBody(created.GetID(), Jolt.EActivation_DontActivate);
      return created;
    }

    function moveBodyTo(y: number): void {
      const Jolt = physics.Jolt;
      physics.bodyInterface.SetPosition(
        body.body.GetID(),
        new Jolt.RVec3(0, y, 0),
        Jolt.EActivation_DontActivate,
      );
    }

    it('registers and frees the body with the object', () => {
      go.add(body);
      expect(physics.physicsSystem.GetNumBodies()).toBe(1);
      go.dispatchCollisionEnter(go);
      go.destroy();
      expect(physics.physicsSystem.GetNumBodies()).toBe(0);
    });

    it('does nothing at render without a mesh', () => {
      go.add(body);
      expect(() => go.render(0.1)).not.toThrow();
      go.destroy();
    });

    it('moves the mesh between the last two poses by the loop alpha', () => {
      const mesh = spawn(MeshComponent);
      mesh.object = new THREE.Object3D();
      go.add(mesh);
      go.add(body);
      go.render(0.1);
      expect(mesh.object.position.y).toBe(10);
      go.fixedUpdate();
      moveBodyTo(8);
      TestBed.inject(GameLoop).alpha = 0.5;
      go.render(0.1);
      expect(mesh.object.position.y).toBe(9);
      TestBed.inject(GameLoop).alpha = 1;
      go.render(0.1);
      expect(mesh.object.position.y).toBe(8);
      go.destroy();
    });
  });
});
