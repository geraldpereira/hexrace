import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { AudioHub } from '@hexrace/car';
import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { CarShowcase } from '@ui/lab/car/car-showcase';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelButton, panelRow, panelSelect } from '@ui/testing/panel.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

interface Page {
  host: HTMLElement;
  page: CarShowcase;
  destroy(): void;
}

function sweep(row: Element): void {
  const control = row.querySelector('input, select, button');
  if (!(control instanceof HTMLElement) || control.hasAttribute('disabled')) return;
  if (control instanceof HTMLSelectElement) {
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (control instanceof HTMLButtonElement) {
    control.click();
    return;
  }
  if (!(control instanceof HTMLInputElement)) return;
  if (control.type === 'checkbox') {
    control.click();
    control.click();
    return;
  }
  control.value = String(Number(control.value) + 1);
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new FocusEvent('blur'));
}

function finish(name: string, value: string): void {
  const input = panelRow(name).querySelector('input')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur'));
}

describe('CarShowcase', () => {
  let capture: FrameCapture;
  let rendered: THREE.Camera[];
  let source: ScriptedSource;

  beforeEach(() => {
    capture = captureFrames({ clock: true });
    rendered = [];
    source = new ScriptedSource();
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera);
    });
    stubResizeObserver({ width: 400, height: 300 });
  });

  async function render(): Promise<Page> {
    await TestBed.configureTestingModule({
      imports: [CarShowcase],
      providers: [provideRouter([]), { provide: INPUT_SOURCES, useValue: source, multi: true }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CarShowcase);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      page: fixture.componentInstance,
      destroy: () => fixture.destroy(),
    };
  }

  async function loaded(): Promise<Page> {
    const page = await render();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.tick();
    return page;
  }

  it('waits for the physics, and builds nothing once the page is left', async () => {
    const { host, destroy } = await render();
    expect(host.textContent).toContain('Loading the physics');
    destroy();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    expect(TestBed.inject(JoltPhysics).physicsSystem.GetNumBodies()).toBe(0);
  });

  it('lays the ground and the obstacles, then drives the car with the camera behind', async () => {
    const { host, page, destroy } = await loaded();
    const physics = TestBed.inject(JoltPhysics);
    expect(host.textContent).toContain('Throttle, brake, steer');
    expect(physics.physicsSystem.GetNumBodies()).toBe(4);
    expect(page.car.contacts).toHaveLength(4);
    expect(host.querySelector('hr-rev-counter')).not.toBeNull();
    expect(host.querySelector('hr-gear-indicator')).not.toBeNull();
    expect(page.showPaddles()).toBe(false);
    expect(host.querySelector('hr-touch-paddles')).toBeNull();

    capture.tick(20, 50);
    expect(rendered.length).toBeGreaterThan(0);
    expect(page.car.contacts[0]?.surface.key).toBe('firm');
    source.actions.throttle = 1;
    capture.tick(120, 50);
    expect(page.kmh()).toBeGreaterThan(20);
    expect(page.rpm()).toBeGreaterThan(800);
    expect(page.gear()).toBeGreaterThan(1);
    expect(page.car.position.z).toBeGreaterThan(5);
    expect(rendered.at(-1)!.position.y).toBeGreaterThan(1);
    source.actions.steer = 1;
    capture.tick(40, 50);
    expect(Math.abs(page.car.heading)).toBeGreaterThan(0.02);
    expect(host.textContent).toContain('km/h');
    destroy();
  });

  it('rebuilds what the panel changes and answers its buttons', async () => {
    const { page, destroy } = await loaded();
    const physics = TestBed.inject(JoltPhysics);
    source.actions.throttle = 1;
    capture.tick(60, 50);
    expect(page.car.position.z).toBeGreaterThan(1);

    const before = page.car;
    finish('Mass (kg)', '1800');
    capture.tick(2, 50);
    expect(page.car === before).toBe(false);
    expect(page.spec.chassis.mass).toBe(1800);
    expect(page.car.position.z).toBeLessThan(1);
    expect(physics.physicsSystem.GetNumBodies()).toBe(4);

    panelSelect('Environment', 'North');
    capture.tick(10, 50);
    expect(page.environment).toBe('north');
    expect(page.car.contacts[0]?.surface.key).toBe('packed');

    panelRow('Ramp').querySelector('input')!.click();
    capture.tick(2, 50);
    expect(page.obstacles.ramp).toBe(false);
    expect(physics.physicsSystem.GetNumBodies()).toBe(3);
    panelRow('Ramp').querySelector('input')!.click();
    capture.tick(2, 50);
    expect(physics.physicsSystem.GetNumBodies()).toBe(4);

    panelButton('Reset car').click();
    capture.tick(1, 50);
    expect(page.car.position.z).toBeLessThan(1);
    panelButton('Drop a crate').click();
    expect(physics.physicsSystem.GetNumBodies()).toBe(5);
    panelButton('Clear').click();
    expect(page.marks.segments).toBe(0);
    panelButton('Start sound').click();
    expect(TestBed.inject(AudioHub).ready).toBe(false);
    destroy();
  });

  it('lights the assist lamps once the options are bought', async () => {
    const { host, page, destroy } = await loaded();
    expect(host.querySelector('hr-assist-lamps svg')).toBeNull();
    page.options.abs.enabled = true;
    page.options.tractionControl.enabled = true;
    capture.tick(2, 50);
    expect(host.querySelectorAll('hr-assist-lamps svg')).toHaveLength(2);
    expect(page.assists().abs).toBe(false);
    destroy();
  });

  it('answers every knob of the panel, from the model to the sound and the dust', async () => {
    const { destroy } = await loaded();
    const folder = [...document.querySelectorAll('.lil-gui')].find(
      (gui) => gui.querySelector(':scope > .lil-title')?.textContent === 'Car',
    )!;
    const rows = [...folder.querySelectorAll('.lil-controller')];
    for (const row of rows) {
      const name = row.querySelector('.lil-name')?.textContent ?? '';
      if (name === 'Reset folder' || name === 'Reset all') continue;
      sweep(row);
    }
    capture.tick(4, 50);
    destroy();
  });
});
