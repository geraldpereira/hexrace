import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FollowCamera } from '@hexrace/camera';
import {
  AudioHub,
  type CarController,
  type CarOptions,
  type CarSpec,
  DEFAULT_CAR_OPTIONS,
  DEFAULT_CAR_SPEC,
  type SkidMarks,
} from '@hexrace/car';
import { EventBus } from '@hexrace/commons';
import { type CameraComponent, LightComponent } from '@hexrace/engine';
import {
  BestTimes,
  DEFAULT_LAPS,
  type RaceDirector,
  type RaceFinish,
  type TrackStage,
} from '@hexrace/game-commons';
import {
  AssistLamps,
  CanvasFrame,
  Countdown,
  type DebugFolder,
  RaceTimer,
  ResetGauge,
  type ResultsChoice,
  ResultsDialogs,
  type TimerReadout,
  TouchPaddles,
  WrongWay,
} from '@hexrace/hud';
import { Inputs, TouchSource } from '@hexrace/inputs';
import {
  type Track,
  type TrackIssue,
  TrackExamples,
  TrackFiles,
  TrackGenerator,
  TrackValidation,
} from '@hexrace/track';

import { CarDash } from '@ui/lab/car/car-dash';
import { CarGauges } from '@ui/lab/car/car-gauges';
import { InputPoller } from '@ui/lab/car/input-poller';
import { IssueList } from '@ui/lab/issue-list';
import { PhysicsLab } from '@ui/lab/lab-scene';
import { RACE_TITLE, type RaceBench, type RaceSettings } from '@ui/lab/race/race-bench';
import { RacePanel } from '@ui/lab/race/race-panel';
import { RaceScene } from '@ui/lab/race/race-scene';
import { TrackDraft } from '@ui/lab/track/track-draft';

const NO_TIME = '--';

/**
 * POC 3 at last (functional spec 10.3): the car of `lab/car` on a track of `lab/track`, married by
 * the `game-commons` director. The window of tiles walks with the car, the surface under each wheel
 * is the one of the tile it stands on, the countdown holds the car on the line, the chrono and the
 * laps run over the HUD, falling off puts the car back, and the finish opens the results box.
 */
@Component({
  selector: 'hr-race-showcase',
  imports: [
    RouterLink,
    CanvasFrame,
    TouchPaddles,
    CarGauges,
    IssueList,
    AssistLamps,
    Countdown,
    RaceTimer,
    WrongWay,
    ResetGauge,
  ],
  templateUrl: './race-showcase.html',
  styleUrl: './race-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceShowcase extends PhysicsLab implements OnInit, RaceBench {
  readonly touch = inject(TouchSource);
  readonly inputs = inject(Inputs);
  readonly draft = new TrackDraft();
  readonly settings: RaceSettings = { mode: 'track', laps: DEFAULT_LAPS };
  readonly spec: CarSpec = structuredClone(DEFAULT_CAR_SPEC);
  readonly options: CarOptions = structuredClone(DEFAULT_CAR_OPTIONS);

  readonly dash = new CarDash();
  readonly status = signal('Loading the physics…');
  readonly issues = signal<readonly string[]>([]);
  readonly text = signal('');
  readonly countdownStep = signal<number | null>(null);
  readonly wrongWay = signal(false);
  readonly bestMs = signal<number | null>(null);
  readonly timer = signal<TimerReadout>({
    mode: 'track',
    currentMs: 0,
    lap: 0,
    lapCount: 1,
    bestMs: null,
    deltaMs: null,
    splitsMs: [],
  });

  stage!: TrackStage;
  director!: RaceDirector;
  car!: CarController;
  marks!: SkidMarks;

  private readonly bestTimes = inject(BestTimes);
  private readonly builder = inject(RaceScene);
  private readonly bus = inject(EventBus);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly examples = inject(TrackExamples);
  private readonly files = inject(TrackFiles);
  private readonly generator = inject(TrackGenerator);
  private readonly hub = inject(AudioHub);
  private readonly racePanel = inject(RacePanel);
  private readonly results = inject(ResultsDialogs);
  private readonly router = inject(Router);
  private readonly validation = inject(TrackValidation);
  readonly showPaddles = signal(this.prefersTouch());
  /** False until a key or a tap has started the sound; a gamepad alone cannot. */
  readonly soundReady = signal(this.hub.ready);
  readonly soundSupported = this.hub.supported;
  private readonly follow = this.scene.instantiate(FollowCamera);
  private eye!: CameraComponent;
  private trackId = '';

  constructor() {
    super();
    const off = this.bus.on('race/finish', (event: RaceFinish) => {
      this.finished(event);
    });
    this.hub.whenReady(() => {
      this.soundReady.set(true);
    });
    this.destroyRef.onDestroy(() => {
      off();
      this.leave();
    });
  }

  get best(): string {
    const best = this.bestMs();
    return best === null ? NO_TIME : `${(best / 1000).toFixed(2)} s`;
  }

  get tile(): number {
    return Math.floor(this.director.state.position);
  }

  ngOnInit(): void {
    this.load();
  }

  /** Reads the track the draft asks for, lays it in the stage, and starts the race over on it. */
  rebuild(): void {
    const load = this.draft.load(this.examples, this.files, this.generator);
    const track = load.track;
    if (!track) {
      this.issues.set(load.errors);
      this.status.set('The file does not read.');
      return;
    }
    if (this.draft.source !== 'text') this.text.set(this.files.serialize(track));
    const review = this.validation.validate(track);
    this.issues.set(review.issues.map((issue: TrackIssue) => this.validation.format(issue)));
    this.stage.load(track);
    this.adopt(track);
    this.status.set(this.headline(track, review.placement.tiles.length));
    this.restart();
  }

  /** Back to the countdown on the start line, with whatever the panel asks of the race now. */
  restart(): void {
    this.director.rules = { mode: this.settings.mode, laps: this.settings.laps };
    this.director.restart();
    this.marks.clear();
    if (this.follow.started) this.follow.snap();
  }

  startSound(): void {
    this.hub.unlock();
  }

  clearBest(): void {
    this.bestTimes.clear();
    this.bestMs.set(null);
  }

  /** Reads what the text area holds as a track file, and drives on what it says. */
  loadText(text: string): void {
    this.draft.source = 'text';
    this.draft.text = text;
    this.rebuild();
  }

  protected start(): void {
    this.scene.spawn('inputs', InputPoller);
    this.scene.spawn('sun', LightComponent);
    this.eye = this.followCamera(this.follow);
    const built = this.builder.build(this.scene, this.spec, this.options);
    this.stage = built.stage;
    this.director = built.director;
    this.car = built.parts.car;
    this.marks = built.parts.marks;
    built.parts.particles.camera = this.eye.camera;
    this.follow.target = this.car;
    this.dash.options = this.options;
    this.rebuild();
    this.showPanel(RACE_TITLE, (folder: DebugFolder) => {
      this.racePanel.build(folder, this);
    });
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.readRace();
    this.dash.read(this.car.state);
    this.renderer.render(this.eye.camera);
  }

  private readRace(): void {
    const race = this.director.state;
    this.countdownStep.set(race.countdownStep);
    this.wrongWay.set(race.wrongWay);
    this.timer.set({
      mode: this.settings.mode,
      currentMs: race.elapsedMs,
      lap: race.lap,
      lapCount: race.lapCount,
      bestMs: null,
      deltaMs: null,
      splitsMs: [],
    });
  }

  private adopt(track: Track): void {
    this.trackId = track.id;
    this.settings.mode = track.mode;
    this.settings.laps = track.laps ?? this.settings.laps;
    this.bestMs.set(this.bestTimes.best(track.id));
    this.racePanel.onTrackLoaded();
  }

  private headline(track: Track, tiles: number): string {
    if (tiles === 0) return `${track.name} lays no tile to drive on.`;
    const verdict = this.issues().length === 0 ? 'the model accepts it' : 'see what it refuses';
    return `${track.name} · ${String(tiles)} tiles · ${verdict}`;
  }

  private finished(event: RaceFinish): void {
    this.bestMs.set(this.bestTimes.best(this.trackId));
    void this.results
      .open({ mode: this.settings.mode, timeMs: event.timeMs, record: event.record })
      .then((choice: ResultsChoice) => {
        this.chose(choice);
      });
  }

  private chose(choice: ResultsChoice): void {
    if (choice === 'retry') this.restart();
    else void this.router.navigate(['/lab']);
  }

  private prefersTouch(): boolean {
    const view = this.document.defaultView as Window;
    return view.matchMedia('(pointer: coarse)').matches;
  }
}
