/**
 * The engine: `GameLoop` at a fixed step, `Scenes` making a `Scene` per screen with its own
 * injector, `GameObject` / `Component` for what lives in it, and the two platform services,
 * `ThreeRenderer` and `JoltPhysics`, named for what they are: nothing abstracts three.js or Jolt.
 * Game modules read this; nothing here knows a car or a tile.
 */
export { BodyComponent } from '@engine/components/body-component';
export { CameraComponent } from '@engine/components/camera-component';
export { LightComponent } from '@engine/components/light-component';
export { MeshComponent } from '@engine/components/mesh-component';
export { FIXED_TIMESTEP, GameLoop, type LoopHandlers } from '@engine/loop/game-loop';
export {
  JoltPhysics,
  LAYER_MOVING,
  LAYER_NON_MOVING,
  type JoltApi,
  type JoltBody,
  type JoltBodyInterface,
  type JoltPhysicsSystem,
} from '@engine/physics/jolt-physics';
export { ThreeRenderer } from '@engine/render/three-renderer';
export { Component, GameObject } from '@engine/scene/game-object';
export { Scene, Scenes } from '@engine/scene/scene';
