import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, type ParamMap, Router } from '@angular/router';

import { DEFAULT_LAPS, type RaceFinish } from '@hexrace/game-commons';
import {
  CanvasFrame,
  type MenuItem,
  MenuList,
  type RaceMode,
  type ResultsChoice,
  ResultsDialogs,
  TouchPaddles,
} from '@hexrace/hud';
import { Inputs, TouchSource } from '@hexrace/inputs';
import { type TrackMode } from '@hexrace/track';

import { type PlayableTrack, GameTracks } from '@ui/game/game-tracks';
import { DrivingPage } from '@ui/scene/driving-page';
import { RaceHud } from '@ui/scene/race-hud';

const PRESSED = 0.5;

const RACE_CHOICES: readonly MenuItem[] = [
  { id: 'resume', label: 'Resume', icon: 'play_arrow' },
  { id: 'retry', label: 'Retry', icon: 'replay' },
  { id: 'home', label: 'Home', icon: 'home' },
];

/**
 * The race itself (functional spec 4.2 and 4.3): the track the address names laid in the stage,
 * the car on its start line, the countdown, the chrono, the laps of a Track loop or the finish
 * line of a Rally, and the results box at the flag. There is no pause (4.1): back opens a menu
 * offering the same three ways out, Resume, Retry and Home, and the race runs on behind it, so
 * that no stray press ever loses a run.
 */
@Component({
  selector: 'hr-race-page',
  imports: [CanvasFrame, TouchPaddles, MenuList, RaceHud],
  templateUrl: './race-page.html',
  styleUrl: './race-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacePage extends DrivingPage implements OnInit {
  readonly touch = inject(TouchSource);
  readonly quitChoices = RACE_CHOICES;
  readonly quitting = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly games = inject(GameTracks);
  private readonly inputs = inject(Inputs);
  private readonly results = inject(ResultsDialogs);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly showPaddles = signal(this.prefersTouch());
  private playable: PlayableTrack | null = null;
  private raceMode: RaceMode = 'track';
  private backWasHeld = true;

  ngOnInit(): void {
    void this.asked().then((playable: PlayableTrack | null) => {
      this.playable = playable;
      if (playable) this.load();
      else this.home();
    });
  }

  /** Back to the countdown on the start line, with the tyre marks of the last run wiped. */
  restart(): void {
    this.quitting.set(false);
    this.race.director.restart();
    this.race.parts.marks.clear();
    this.follow.snap();
  }

  /** What the race menu answered: Retry starts over, Home leaves, anything else drives on. */
  quitChose(choice: string): void {
    if (choice === 'home') this.home();
    else if (choice === 'retry') this.restart();
    else this.quitting.set(false);
  }

  home(): void {
    void this.router.navigate(['/']);
  }

  protected get mode(): RaceMode {
    return this.raceMode;
  }

  protected ready(): void {
    const track = this.playable!.track;
    this.raceMode = track.mode;
    this.race.stage.load(track);
    this.race.director.rules = { mode: track.mode, laps: track.laps ?? DEFAULT_LAPS };
    this.race.director.restart();
  }

  protected override render(dt: number): void {
    this.askedToQuit();
    super.render(dt);
  }

  protected finished(event: RaceFinish): void {
    this.quitting.set(false);
    void this.results
      .open({ mode: this.mode, timeMs: event.timeMs, record: event.record })
      .then((choice: ResultsChoice) => {
        if (choice === 'retry') this.restart();
        else this.home();
      });
  }

  private asked(): Promise<PlayableTrack | null> {
    const params: ParamMap = this.route.snapshot.paramMap;
    const mode: TrackMode | null = this.games.modeOf(params.get('mode'));
    const country = params.get('country') ?? '';
    const seed = params.get('seed') ?? '';
    if (!mode) return Promise.resolve(null);
    if (seed !== '') return this.games.random(mode, country, seed);
    return this.games.shipped(mode, country, params.get('track') ?? '');
  }

  private askedToQuit(): void {
    const held = this.inputs.actions.back > PRESSED;
    if (held && !this.backWasHeld) this.quitting.set(true);
    this.backWasHeld = held;
  }

  private prefersTouch(): boolean {
    const view = this.document.defaultView as Window;
    return view.matchMedia('(pointer: coarse)').matches;
  }
}
