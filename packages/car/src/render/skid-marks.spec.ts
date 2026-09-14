import { TestBed } from '@angular/core/testing';
import { type GameObject, Scenes, ThreeRenderer } from '@hexrace/engine';

import { SkidMarks } from '@car/render/skid-marks';
import { type FakeReadout, fakeReadout } from '@car/render/readout.mock';

describe('SkidMarks', () => {
  let readout: FakeReadout;
  let marks: SkidMarks;
  let object: GameObject;

  beforeEach(() => {
    readout = fakeReadout();
    const scene = TestBed.inject(Scenes).create();
    marks = scene.instantiate(SkidMarks);
    marks.readout = readout;
    object = scene.spawn('marks');
    object.add(marks);
    scene.start();
  });

  function slide(times: number, along = 0.2): void {
    for (let i = 0; i < times; i++) {
      for (const [w, contact] of readout.contacts.entries()) {
        contact.longitudinalSlip = 1;
        contact.slipSpeed = 6;
        contact.point.z += along;
        contact.point.x = w;
      }
      marks.render?.(1 / 60);
    }
  }

  it('lays a ribbon while the tyres scrub, and nothing when they roll clean', () => {
    expect(TestBed.inject(ThreeRenderer).scene.children).toHaveLength(1);
    marks.render?.(1 / 60);
    expect(marks.segments).toBe(0);
    slide(20);
    expect(marks.segments).toBeGreaterThan(0);
    expect(marks.wheelIntensity[0]).toBeGreaterThan(0.5);
    const laid = marks.segments;
    for (const contact of readout.contacts) {
      contact.longitudinalSlip = 0;
      contact.slipSpeed = 0;
    }
    for (let i = 0; i < 60; i++) marks.render?.(1 / 60);
    expect(marks.wheelIntensity[0]).toBe(0);
    expect(marks.segments).toBe(laid);
  });

  it('marks sideways too when the option is on, and never off the ground', () => {
    marks.lateralEnabled = true;
    for (const contact of readout.contacts) contact.lateralSlipDeg = 40;
    for (let i = 0; i < 20; i++) {
      for (const contact of readout.contacts) contact.point.z += 0.2;
      marks.render?.(1 / 60);
    }
    expect(marks.segments).toBeGreaterThan(0);
    for (const contact of readout.contacts) contact.contact = false;
    const laid = marks.segments;
    for (let i = 0; i < 30; i++) marks.render?.(1 / 60);
    expect(marks.segments).toBe(laid);
  });

  it('stops laying when switched off, wipes on clear, and lets go of its mesh', () => {
    slide(10);
    marks.enabled = false;
    const laid = marks.segments;
    slide(10);
    expect(marks.segments).toBe(laid);
    marks.clear();
    expect(marks.segments).toBe(0);
    marks.attack = 0;
    marks.release = 0;
    marks.lockSlipFull = marks.lockSlipStart;
    marks.slipSpeedFull = marks.slipSpeedStart;
    marks.enabled = true;
    slide(4);
    expect(marks.wheelIntensity[0]).toBe(1);
    for (const contact of readout.contacts) contact.slipSpeed = 0;
    marks.render?.(1 / 60);
    expect(marks.wheelIntensity[0]).toBe(0);
    object.destroy();
    expect(TestBed.inject(ThreeRenderer).scene.children).toHaveLength(0);
  });
});
