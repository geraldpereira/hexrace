import { inject } from '@angular/core';

import { type FollowCamera } from '@hexrace/camera';
import {
  CameraComponent,
  FIXED_TIMESTEP,
  GameLoop,
  JoltPhysics,
  Scenes,
  ThreeRenderer,
} from '@hexrace/engine';
import { type FrameSize, PerfMeter } from '@hexrace/hud';

/**
 * The plumbing every page with a 3D scene shares, lab page or game screen: the renderer and its
 * canvas, Jolt loaded on `load`, the loop started the game way (the scene's fixed update, then the
 * physics step, then the frame), and the clean-up when the page is left. It shows nothing of its
 * own: no debug panel, no performance corner, no crate. A subclass builds its scene in `start`,
 * once the wasm is there, and renders through `render`; `load` is called from its `ngOnInit`.
 */
export abstract class ScenePage {
  protected readonly renderer = inject(ThreeRenderer);
  readonly canvas = this.renderer.canvas;

  protected readonly physics = inject(JoltPhysics);
  protected readonly loop = inject(GameLoop);
  protected readonly meter = inject(PerfMeter);
  protected readonly scene = inject(Scenes).create();
  protected camera: CameraComponent | null = null;
  private alive = true;

  onResized(size: FrameSize): void {
    this.renderer.resize(size.width, size.height);
    this.camera?.setAspect(size.width, size.height);
  }

  protected load(): void {
    void this.physics.load().then(() => {
      if (this.alive) this.begin();
    });
  }

  /** The scene's camera, driven by `follow` and sized to the canvas: what a driving page renders through. */
  protected followCamera(follow: FollowCamera): CameraComponent {
    const object = this.scene.spawn('camera', CameraComponent);
    object.add(follow);
    const eye = object.getOrThrow(CameraComponent);
    this.camera = eye;
    eye.setAspect(this.renderer.width, this.renderer.height);
    return eye;
  }

  protected abstract start(): void;

  protected abstract render(dt: number): void;

  protected leave(): void {
    this.alive = false;
    this.loop.stop();
    this.scene.destroy();
  }

  protected frame(dt: number): void {
    this.scene.render(dt);
    this.meter.step(this.loop.stepMs);
    this.meter.frame(performance.now());
  }

  private begin(): void {
    this.start();
    this.scene.start();
    this.loop.start({
      fixedUpdate: () => {
        this.scene.fixedUpdate();
        this.physics.step(FIXED_TIMESTEP);
      },
      render: (dt: number) => this.render(dt),
    });
  }
}
