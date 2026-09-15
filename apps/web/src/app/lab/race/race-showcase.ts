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
import { AudioHub } from '@hexrace/car';
import { BestTimes, DEFAULT_LAPS, type RaceFinish } from '@hexrace/game-commons';
import {
  CanvasFrame,
  DebugPanel,
  type DebugFolder,
  type RaceMode,
  type ResultsChoice,
  ResultsDialogs,
  TouchPaddles,
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

import { IssueList } from '@ui/lab/issue-list';
import { RACE_TITLE, type RaceBench, type RaceSettings } from '@ui/lab/race/race-bench';
import { RacePanel } from '@ui/lab/race/race-panel';
import { TrackDraft } from '@ui/lab/track/track-draft';
import { DrivingPage } from '@ui/scene/driving-page';
import { RaceHud } from '@ui/scene/race-hud';

const NO_TIME = '--';

/**
 * POC 3 at last (functional spec 10.3): the car of `lab/car` on a track of `lab/track`, married by
 * the `game-commons` director. The window of tiles walks with the car, the surface under each wheel
 * is the one of the tile it stands on, the countdown holds the car on the line, the chrono and the
 * laps run over the HUD, falling off puts the car back, and the finish opens the results box.
 */
@Component({
  selector: 'hr-race-showcase',
  imports: [RouterLink, CanvasFrame, TouchPaddles, IssueList, RaceHud],
  templateUrl: './race-showcase.html',
  styleUrl: './race-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceShowcase extends DrivingPage implements OnInit, RaceBench {
  readonly touch = inject(TouchSource);
  readonly inputs = inject(Inputs);
  readonly draft = new TrackDraft();
  readonly settings: RaceSettings = { mode: 'track', laps: DEFAULT_LAPS };

  readonly status = signal('Loading the physics…');
  readonly issues = signal<readonly string[]>([]);
  readonly text = signal('');
  readonly bestMs = signal<number | null>(null);

  private readonly bestTimes = inject(BestTimes);
  private readonly debugPanel = inject(DebugPanel);
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
  private trackId = '';

  constructor() {
    super();
    this.hub.whenReady(() => {
      this.soundReady.set(true);
    });
  }

  get best(): string {
    const best = this.bestMs();
    return best === null ? NO_TIME : `${(best / 1000).toFixed(2)} s`;
  }

  get tile(): number {
    return Math.floor(this.race.director.state.position);
  }

  ngOnInit(): void {
    this.meter.cornerVisible.set(true);
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
    this.race.stage.load(track);
    this.adopt(track);
    this.status.set(this.headline(track, review.placement.tiles.length));
    this.restart();
  }

  /** Back to the countdown on the start line, with whatever the panel asks of the race now. */
  restart(): void {
    this.race.director.rules = { mode: this.settings.mode, laps: this.settings.laps };
    this.race.director.restart();
    this.race.parts.marks.clear();
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

  protected get mode(): RaceMode {
    return this.settings.mode;
  }

  protected ready(): void {
    this.rebuild();
    this.debugPanel.register(
      RACE_TITLE,
      (folder: DebugFolder) => {
        this.racePanel.build(folder, this);
      },
      this.destroyRef,
    );
    this.debugPanel.show();
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

  protected finished(event: RaceFinish): void {
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
