import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Small branded banner shared by every app in the workspace.
 * Demonstrates consuming a workspace library via the `@pranav/shared-ui` alias.
 */
@Component({
  selector: 'shared-ui',
  templateUrl: './shared-ui.html',
  styleUrl: './shared-ui.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedUi {
  readonly appName = input.required<string>();
}
