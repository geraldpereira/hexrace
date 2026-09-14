import { InjectionToken, inject } from '@angular/core';

import { GameComponent } from '@engine/scene/game-component';
import { type GameObject } from '@engine/scene/game-object';
import { Scene } from '@engine/scene/scene';

export class Log extends GameComponent {
  static readonly events: string[] = [];
  label = '';

  static named(label: string): Log {
    const c = new Log();
    c.label = label;
    return c;
  }

  override awake(): void {
    Log.events.push(`awake ${this.label}`);
  }

  override start(): void {
    Log.events.push(`start ${this.label}`);
  }

  override fixedUpdate(): void {
    Log.events.push(`fixed ${this.label}`);
  }

  override render(dt: number): void {
    Log.events.push(`render ${this.label} ${dt}`);
  }

  override onCollisionEnter(other: GameObject): void {
    Log.events.push(`hit ${this.label} by ${other.name}`);
  }

  override onDestroy(): void {
    Log.events.push(`destroy ${this.label}`);
  }
}

export class Silent extends GameComponent {}

export class Killer extends GameComponent {
  victim!: GameObject;

  override fixedUpdate(): void {
    this.victim.destroy();
  }

  override render(): void {
    this.victim.destroy();
  }
}

export const GRAVITY = new InjectionToken<number>('GRAVITY');

export class Probe extends GameComponent {
  readonly scene = inject(Scene);
  readonly gravity = inject(GRAVITY);
  fixed = 0;
  rendered: number[] = [];
  destroyed = false;

  override fixedUpdate(): void {
    this.fixed += 1;
  }

  override render(dt: number): void {
    this.rendered.push(dt);
  }

  override onDestroy(): void {
    this.destroyed = true;
  }
}

export class Hits extends GameComponent {
  hits: string[] = [];

  override onCollisionEnter(other: GameObject): void {
    this.hits.push(other.name);
  }
}
