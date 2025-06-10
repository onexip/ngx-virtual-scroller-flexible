import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import {
  Directive,
  EventEmitter,
  forwardRef,
  Input,
  Output,
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
  _scrollStrategy = new ExampleBasedVirtualScrollStrategy();

  /**
   * Sets the track items to virtually scroll over. A track represents a row or
   * a column depending on the scroll direction of the scroller.
   */
  @Input()
  set tracks(value: Track[]) {
    this._scrollStrategy.updateTracks(value);
  }

  /**
   * Set the number of groups of items with the same size.
   * Suppose the items input array has three different kinds of displaying a row in the scroller then there are 3 groups of items that are the same size.
   * These three different sizes will be measured for the virtual scrolling to work correctly.
   *
   * Default: undefined
   */
  @Input()
  set expectedSameSizeCount(value: number) {
    this._scrollStrategy.expectedSameSizeCount = value;
  }

  /**
   * Sets the factor of how much of the visible viewport should be buffered on the side that is scrolled away out of the viewport.
   * For a 1000px viewport and a factor of 0.5 that would mean that 500px before the visible area are still kept in memory to allow for performant 'scroll backs'.
   *
   * Default: 0.5
   */
  @Input()
  set outgoingBufferFactor(value: number) {
    this._scrollStrategy.outgoingBufferFactor = value;
  }

  /**
   * Sets the factor of how much of the visible viewport should be buffered on the side that is scrolled into the viewport.
   * For a 1000px viewport and a factor of 1.5 that would mean that 1500px after the visible area are already prepared in memory to allow for very performant forward scrolling.
   *
   * Default: 3.5
   */
  @Input()
  set incomingBufferFactor(value: number) {
    this._scrollStrategy.incomingBufferFactor = value;
  }

  /**
   * Emits the updated rendered range when it distinctly changes.
   */
  @Output()
  renderedRangeChange = new EventEmitter<[Range, Range]>();

  constructor() {
    this._scrollStrategy.renderedRangeChange = this.renderedRangeChange;
  }
}
