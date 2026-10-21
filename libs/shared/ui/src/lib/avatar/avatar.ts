import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MEMBER_COLORS } from '@pranav/shared-models';
import { hashString, initials } from '@pranav/shared-util';

/** Circular initials avatar. Pass `color` to match a member's assigned colour. */
@Component({
  selector: 'shared-avatar',
  template: `<span
    class="avatar"
    [style.background]="bg()"
    [style.--size.px]="size()"
    >{{ text() }}</span
  >`,
  styles: `
    :host {
      display: inline-flex;
    }
    .avatar {
      --size: 40px;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: var(--pv-display, inherit);
      font-weight: 800;
      font-size: calc(var(--size) * 0.42);
      letter-spacing: 0.02em;
      user-select: none;
      flex-shrink: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(40);
  readonly color = input<string | undefined>(undefined);

  protected readonly text = computed(() => initials(this.name()));
  protected readonly bg = computed(
    () =>
      this.color() ??
      MEMBER_COLORS[hashString(this.name()) % MEMBER_COLORS.length],
  );
}
