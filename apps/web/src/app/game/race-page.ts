import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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

import { type PlayableTrack, GameTracks } from '@ui/game/game-tracks';
import { DrivingPage } from '@ui/scene/driving-page';
import { RaceHud } from '@ui/scene/race-hud';

const PRESSED = 0.5;

const QUIT_CHOICES: readonly MenuItem[] = [
  { id: 'resume', label: 'Resume', icon: 'play_arrow' },
  { id: 'quit', label: 'Quit', icon: 'home' },
];

/**
 * The race itself (functional spec 4.2): the track laid in the stage, the car on its start line,
 * the countdown, the chrono, the laps and the HUD over the canvas, and the results box at the
 * flag, from which Retry runs the same track again and Home leaves for the front page. There is
 * no pause (functional spec 4.1): back only asks whether to quit, and the race runs on behind the
 * question, so that no stray press ever loses a run.
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
  readonly quitChoices = QUIT_CHOICES;
  readonly quitting = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly inputs = inject(Inputs);
  private readonly results = inject(ResultsDialogs);
  private readonly router = inject(Router);
  private readonly playable: PlayableTrack | null = inject(GameTracks).of(
    inject(ActivatedRoute).snapshot.paramMap.get('track') ?? '',
  );
  readonly showPaddles = signal(this.prefersTouch());
  protected readonly mode: RaceMode = 'track';
  private backWasHeld = true;

  ngOnInit(): void {
    if (this.playable) this.load();
    else this.home();
  }

  /** Back to the countdown on the start line, with the tyre marks of the last run wiped. */
  restart(): void {
    this.quitting.set(false);
    this.race.director.restart();
    this.race.parts.marks.clear();
    this.follow.snap();
  }

  /** What the quit question answered: anything but Quit puts the player back in the race. */
  quitChose(choice: string): void {
    if (choice === 'quit') this.home();
    else this.quitting.set(false);
  }

  home(): void {
    void this.router.navigate(['/']);
  }

  protected ready(): void {
    const track = this.playable!.track;
    this.race.stage.load(track);
    this.race.director.rules = { mode: 'track', laps: track.laps ?? DEFAULT_LAPS };
    this.race.director.restart();
  }

  protected override render(dt: number): void {
    this.askedToQuit();
    super.render(dt);
  }

  protected finished(event: RaceFinish): void {
    this.quitting.set(false);
    void this.results
      .open({ mode: 'track', timeMs: event.timeMs, record: event.record })
      .then((choice: ResultsChoice) => {
        if (choice === 'retry') this.restart();
        else this.home();
      });
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
