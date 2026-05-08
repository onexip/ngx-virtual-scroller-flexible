import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-infinite-scroll-end',
  templateUrl: './infinite-scroll-end.component.html',
  styleUrl: './infinite-scroll-end.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfiniteScrollEndComponent {
  /**
   * When true displays a loading spinner; when false displays the end-of-list
   * indicator. Scroll-end detection and the `endReached` trigger are handled by
   * the `appExampleBasedVirtualScroll` directive via its `(scrolledToEnd)` output
   * — this component is purely presentational.
   */
  readonly loading = input.required<boolean>();
}

// The scroll-end detection logic previously lived here as a DOM scroll
// listener. It has been moved to ExampleBasedVirtualScrollStrategy which
// emits (scrolledToEnd) / (scrolledToStart) on the directive once the asset
// preparation range reaches the list boundaries. Wire those outputs in the
// parent template instead of (endReached) on this component.
