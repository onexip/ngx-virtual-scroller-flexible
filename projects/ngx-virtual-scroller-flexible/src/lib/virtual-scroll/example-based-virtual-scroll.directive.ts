import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import {
  Directive,
  effect,
  forwardRef,
  input,
  output,
  untracked,
} from '@angular/core';
import { ExampleBasedVirtualScrollStrategy } from './example-based-virtual-scroll';
import { Range } from './range';
import { Track } from './types';

// NOTE: This scroller is the continuation of this example.
// https://dev.to/georgii/virtual-scrolling-of-content-with-variable-height-with-angular-3a52
@Directive({
  standalone: true,
  selector: '[appExampleBasedVirtualScroll]',
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: (directive: ExampleBasedVirtualScrollDirective) =>
        directive._scrollStrategy,
      deps: [forwardRef(() => ExampleBasedVirtualScrollDirective)],
    },
  ],
})
export class ExampleBasedVirtualScrollDirective {
  /** @internal – exposed for the VIRTUAL_SCROLL_STRATEGY provider factory only. */
  readonly _scrollStrategy = new ExampleBasedVirtualScrollStrategy();

  /**
   * Sets the track items to virtually scroll over. A track represents a row or
   * a column depending on the scroll direction of the scroller.
   */
  readonly tracks = input<Track[]>([]);

  /**
   * Set the number of groups of items with the same size.
   * Suppose the items input array has three different kinds of displaying a row
   * in the scroller then there are 3 groups of items that are the same size.
   * These three different sizes will be measured for the virtual scrolling to
   * work correctly.
   *
   * Default: undefined
   */
  readonly expectedSameSizeCount = input<number | undefined>(undefined);

  /**
   * Sets the factor of how much of the visible viewport should be buffered on
   * the side that is scrolled away out of the viewport.
   * For a 1000px viewport and a factor of 0.5 that would mean that 500px
   * before the visible area are still kept in memory to allow for performant
   * 'scroll backs'.
   *
   * Default: 0.0
   */
  readonly outgoingBufferFactor = input<number>(0.0);

  /**
   * Sets the factor of how much of the visible viewport should be buffered on
   * the side that is scrolled into the viewport.
   * For a 1000px viewport and a factor of 1.5 that would mean that 1500px
   * after the visible area are already prepared in memory to allow for very
   * performant forward scrolling.
   *
   * Default: 0.8
   */
  readonly incomingBufferFactor = input<number>(0.8);

  /**
   * Sets the factor of how much of the visible viewport assets should be
   * prepared on the side that is scrolled into the viewport.
   * For a 1000px viewport and a factor of 2 that would mean that 2000px after
   * the visible areas assets are already prepared in the dom to allow for very
   * performant forward scrolling.
   *
   * Default: 2
   */
  readonly incomingAssetPreparationFactor = input<number>(2);

  /**
   * Inverts the scroll direction.
   */
  readonly invertedScrolling = input<boolean>(false);

  /**
   * Triggers example size remeasurement when set to true.
   */
  readonly triggerRemeasure = input<boolean>(false);

  /**
   * Emits the updated rendered range when it distinctly changes.
   */
  readonly renderedRangeChange = output<Range>();

  /**
   * Emits the updated asset preparation range when it distinctly changes.
   */
  readonly renderedAssetRangeChange = output<Range>();

  /**
   * Emits once when the asset preparation range reaches the last track.
   * Resets when the tracks array is replaced.
   * Use this to trigger loading of additional data instead of
   * InfiniteScrollEndComponent's own scroll listener.
   */
  readonly scrolledToEnd = output<void>();

  /**
   * Emits once when the asset preparation range reaches the first track.
   * Resets when the tracks array is replaced.
   */
  readonly scrolledToStart = output<void>();

  constructor() {
    // Wire strategy callbacks to signal outputs.
    this._scrollStrategy.onRenderedRangeChange = (range) =>
      this.renderedRangeChange.emit(range);
    this._scrollStrategy.onRenderedAssetRangeChange = (range) =>
      this.renderedAssetRangeChange.emit(range);
    this._scrollStrategy.onScrolledToEnd = () => this.scrolledToEnd.emit();
    this._scrollStrategy.onScrolledToStart = () => this.scrolledToStart.emit();

    // Allow the strategy to read the current tracks synchronously during
    // onDataLengthChanged (which fires during CD, before effects run).
    this._scrollStrategy.tracksSource = () => this.tracks();

    // Sync signal inputs → strategy properties via effects.
    // Use untracked for the strategy call so that any signals read inside
    // updateTracks (e.g. _scrolledIndex) do NOT become dependencies of this
    // effect. Only the tracks() input signal should trigger it.
    effect(() => {
      const tracks = this.tracks();
      untracked(() => this._scrollStrategy.updateTracks(tracks));
    });

    effect(() => {
      this._scrollStrategy.expectedSameSizeCount = this.expectedSameSizeCount();
    });

    effect(() => {
      this._scrollStrategy.outgoingBufferFactor = this.outgoingBufferFactor();
    });

    // incomingBufferFactor and incomingAssetPreparationFactor are validated
    // together since the asset factor must not be smaller than the buffer factor.
    effect(() => {
      const bufferFactor = this.incomingBufferFactor();
      const assetFactor = this.incomingAssetPreparationFactor();
      this._scrollStrategy.incomingBufferFactor = bufferFactor;
      if (assetFactor < bufferFactor) {
        console.error(
          { incomingAssetPreparationFactor: assetFactor },
          "can't be smaller than",
          { incomingBufferFactor: bufferFactor },
        );
        this._scrollStrategy.incomingAssetPreparationFactor = bufferFactor;
      } else {
        this._scrollStrategy.incomingAssetPreparationFactor = assetFactor;
      }
    });

    effect(() => {
      this._scrollStrategy.invertedScrolling = this.invertedScrolling();
    });

    effect(() => {
      if (this.triggerRemeasure()) {
        requestAnimationFrame(() =>
          this._scrollStrategy.remeasureExampleSizes(),
        );
      }
    });
  }

  /**
   * Resets scroll-end (and scroll-start) detection and immediately re-evaluates
   * the current scroll position. Call this after a failed data load so
   * `(scrolledToEnd)` can re-fire and trigger a retry without requiring a
   * scroll gesture.
   */
  resetScrollEndDetection(): void {
    this._scrollStrategy.resetScrollEndDetection();
  }
}
