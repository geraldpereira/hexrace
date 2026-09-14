import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** What the model refuses about the track on show, in words; nothing at all when it accepts it. */
@Component({
  selector: 'hr-issue-list',
  template: `
    @if (issues().length > 0) {
      <ul class="issues">
        @for (issue of issues(); track $index) {
          <li>{{ issue }}</li>
        }
      </ul>
    }
  `,
  styles: `
    .issues {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.78rem;
      color: var(--hr-danger, #ff5a5a);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueList {
  readonly issues = input.required<readonly string[]>();
}
