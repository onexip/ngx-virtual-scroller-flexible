import {
  CdkVirtualScrollViewport,
  VirtualScrollStrategy,
} from '@angular/cdk/scrolling';
import { computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs';
import { Range, updatedRange } from './range';
import { Track } from './types';

export class ExampleBasedVirtualScrollStrategy implements VirtualScrollStrategy {
  private _scrolledIndex = signal<number>(0);
  scrolledIndexChange = toObservable(
    computed(() => this._scrolledIndex()),
  ).pipe(distinctUntilChanged());

  // public properties through scroll directive
  public expectedSameSizeCount?: number;
  public outgoingBufferFactor: number = 0.0;
  public incomingBufferFactor: number = 0.8;
  public incomingAssetPreparationFactor: number = 2;
  public invertedScrolling?: boolean = false;

  // callbacks wired by the directive
  public onRenderedRangeChange?: (range: Range) => void;
  public onRenderedAssetRangeChange?: (range: Range) => void;
  public onScrolledToEnd?: () => void;
  public onScrolledToStart?: () => void;

  /**
   * Optional callback that returns the latest tracks from the directive's
   * signal input. When set, `onDataLengthChanged()` reads it to sync `_tracks`
   * before scheduling measurement — this avoids a timing issue where CDK fires
   * `onDataLengthChanged()` during change detection but the directive's effect
   * (which calls `updateTracks`) only runs after CD.
   */
  public tracksSource?: () => Track[];

  private _styleElement?: HTMLStyleElement;
  private _lastScrollOffset: number = 0;
  private _forwardScroll: boolean = true;
  private _lastScrolledToEnd = false;
  private _lastScrolledToStart = false;
  private _lastRenderedRange: Range = new Range(-1, -1);
  private _lastRenderedAssetRange: Range = new Range(-1, -1);
  private _pendingMeasure: number | null = null;

  private _viewport!: CdkVirtualScrollViewport | null;
  private _wrapper!: ChildNode | null;
  private _resizeObserver: ResizeObserver | null = null;
  private _refreshingViewportSize = false;

  private _tracks: Track[] = [];
  private _accumulatedTrackOffsets: number[] = [];
  private _totalHeight: number = 0;
  private _heights = new Map<string, number>();

  attach(viewport: CdkVirtualScrollViewport): void {
    this._viewport = viewport;
    this._wrapper = viewport.getElementRef().nativeElement.childNodes[0];
    this._attachStyleTag(this._viewport.getElementRef().nativeElement);

    if (this.invertedScrolling === true)
      this._scrolledIndex.set(this._tracks.length);

    // Observe the wrapper for size changes (e.g. container resize, orientation
    // change) so example heights are re-measured without relying on scroll
    // events.
    this._observeWrapperResize();

    // Measure example heights synchronously. Newly created examples may
    // report 0 — that's intentional: 0-height tracks all "fit" in the
    // viewport, so CDK renders everything and content is immediately visible.
    // The deferred rAF then measures accurate CSS-driven heights and corrects
    // the total content size and rendered range.
    this._updateExampleHeights(true);
    this._updateRenderedRange();
    this._deferredMeasure();
  }

  private _attachStyleTag(container: HTMLElement) {
    if (this._styleElement === undefined) {
      this._styleElement = document.createElement('style');
      container.prepend(this._styleElement);
    }
  }

  detach(): void {
    this._detachStyleTag();

    // Cancel pending measure
    if (this._pendingMeasure !== null) {
      cancelAnimationFrame(this._pendingMeasure);
      this._pendingMeasure = null;
    }

    // Disconnect resize observer
    if (this._resizeObserver !== null) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Memory cleanup: Clear map and nullify references
    this._heights.clear();
    this._tracks = [];
    this._accumulatedTrackOffsets = [];
    this._lastRenderedRange = new Range(-1, -1);
    this._lastRenderedAssetRange = new Range(-1, -1);
    this._lastScrolledToEnd = false;
    this._lastScrolledToStart = false;

    this._viewport = null;
    this._wrapper = null;
  }

  private _detachStyleTag() {
    if (this._styleElement !== undefined) {
      this._styleElement.remove();
      this._styleElement = undefined;
    }
  }

  onContentScrolled(): void {
    this._updateRenderedRange();
  }

  onDataLengthChanged(): void {
    // checkViewportSize() calls onDataLengthChanged(). When invoked from
    // _deferredMeasure just to refresh the cached viewport size, skip the
    // full handler — _deferredMeasure already handles measurement and
    // range updates itself.
    if (this._refreshingViewportSize) return;

    // Sync tracks from the directive's signal so _tracks matches CDK's
    // current data length, even when the directive's effect hasn't run yet.
    if (this.tracksSource) {
      const latest = this.tracksSource();
      this._tracks =
        this.invertedScrolling === true ? [...latest].reverse() : latest;
    }

    // Measure example heights synchronously. Newly created examples may
    // report 0 — that's intentional: 0-height tracks all "fit" in the
    // viewport, so CDK renders everything and content is immediately visible.
    // The deferred rAF then measures accurate CSS-driven heights and corrects.
    this._updateExampleHeights(true);
    this._updateRenderedRange();
    this._deferredMeasure();
  }

  onContentRendered(): void {
    /** no-op */
  }

  onRenderedOffsetChanged(): void {
    /** no-op */
  }

  emitRenderedRangeChange(range: Range) {
    if (!this._lastRenderedRange || !this._lastRenderedRange.equals(range)) {
      if (!this.onRenderedRangeChange)
        throw Error('onRenderedRangeChange callback undefined.');
      this.onRenderedRangeChange(range);
      this._lastRenderedRange = range;
    }
  }

  emitRenderedAssetRangeChange(range: Range) {
    if (
      !this._lastRenderedAssetRange ||
      !this._lastRenderedAssetRange.equals(range)
    ) {
      if (!this.onRenderedAssetRangeChange)
        throw Error('onRenderedAssetRangeChange callback undefined.');
      this.onRenderedAssetRangeChange(range);
      this._lastRenderedAssetRange = range;
    }
  }

  scrollToIndex(index: number, behavior: ScrollBehavior): void {
    if (!this._viewport) return;

    const startOffset = this._startOffset();
    const heightsOffset = this._offset(index);
    const offset = startOffset + heightsOffset;

    this._viewport.scrollToOffset(offset, behavior);
  }

  switchToIndex(index: number): void {
    if (!this._viewport) return;

    const scrollOffset = this._viewport.measureScrollOffset();
    const scrollIndex = this._trackIndex(scrollOffset);
    const scrollIndexOffset = this._offset(scrollIndex);
    const innerTrackItemOffset = scrollOffset - scrollIndexOffset;

    const startOffset = this._startOffset();
    const heightsOffset = this._offset(index);
    const offset = startOffset + heightsOffset + innerTrackItemOffset;

    this._viewport.scrollToOffset(offset, 'instant');
  }

  /**
   * Update the tracks array. Keep the last track in view when possible.
   */
  updateTracks(tracks: Track[]): void {
    const tracks_ =
      this.invertedScrolling === true ? [...tracks].reverse() : tracks;

    const currentIndex = this._scrolledIndex();
    const isValidIndex = 0 < currentIndex && currentIndex < this._tracks.length;

    const nextIndex = isValidIndex
      ? tracks_.findIndex(
          (track) => track.trackId() === this._tracks[currentIndex].trackId(),
        )
      : -1;

    this._tracks = tracks_;

    // Notify CDK of the new data length. This calls onDataLengthChanged()
    // which now only syncs tracks and schedules a deferred measure — no
    // synchronous measurement during CD.
    this._viewport?.checkViewportSize();

    if (nextIndex > 0) this.switchToIndex(nextIndex);
  }

  /**
   * Resets scroll-end (and scroll-start) detection and immediately re-evaluates
   * the current scroll position. Use this after a failed data load so the
   * end-of-list event can re-fire and trigger a retry, even when the user has
   * not scrolled.
   */
  resetScrollEndDetection() {
    this._lastScrolledToEnd = false;
    this._lastScrolledToStart = false;
    this._updateRenderedRange();
  }

  /**
   * Update the measured example sizes via a deferred measurement.
   */
  remeasureExampleSizes() {
    this._deferredMeasure();
  }

  /**
   * Update the accumulated height offsets array.
   */
  private _updateAccumulatedTrackOffsets() {
    const tracks = this._tracks;
    let currentTotalSize = 0;
    this._accumulatedTrackOffsets = [0];

    for (let index = 0; index < tracks.length; index++) {
      const track = tracks[index];
      currentTotalSize += this._height(track);
      this._accumulatedTrackOffsets.push(currentTotalSize);
    }
  }

  /**
   * Update the current total height of the scroller content.
   */
  private _updateTotalHeight() {
    this._totalHeight =
      this._accumulatedTrackOffsets[this._accumulatedTrackOffsets.length - 1];
  }

  /**
   * Update the current scroll direction and the last scroll offset position.
   */
  private _updateScrollDirection() {
    if (!this._viewport) return;
    const scrollOffset = this._viewport.measureScrollOffset();

    this._forwardScroll = scrollOffset >= this._lastScrollOffset;
    this._lastScrollOffset = scrollOffset;
  }

  /**
   * Calculates the starting offset of the viewport element.
   *
   * @returns The top offset position of the viewport element.
   * Returns `0` if the viewport is not defined.
   */
  private _startOffset() {
    if (!this._viewport) return 0;
    const startOffset = this._viewport.measureViewportOffset();

    return startOffset;
  }

  /**
   * Returns the height of a given track from the heights cache.
   *
   * Falls back to the viewport height for unmeasured sizeIds so that at most
   * one track is assumed visible. This keeps CDK in a valid state while the
   * deferred measurement picks up the real CSS-driven heights after the
   * browser has laid out the example elements.
   */
  private _height(track: Track): number {
    const cachedHeight = this._heights.get(track.sizeId());
    if (cachedHeight !== undefined) return cachedHeight;
    return this._viewport?.getViewportSize() || 1000;
  }

  /**
   * Returns the offset relative to the top of the container and the top of the
   * track of a provided track index. (Does only account for offsets that are
   * part of the viewport/content wrapper. Pre-Viewport/Scrollable offsets are
   * irrelevant.)
   *
   * @param index
   * @returns
   */
  private _offset(index: number): number {
    const offset = this._accumulatedTrackOffsets[index];
    return offset;
  }

  /**
   * Returns the track index by a provided offset.
   *
   * @param offset
   * @returns
   */
  private _trackIndex(offset: number): number {
    const offsets = this._accumulatedTrackOffsets;
    if (offsets.length <= 1) return 0;

    // Early exit for common cases
    if (offset <= 0) return 0;
    if (offset >= offsets[offsets.length - 1]) return offsets.length - 2;

    // accumulation adds an element
    let high = offsets.length - 2;
    let low = 0;
    let itemIndex = 0;

    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);

      if (offsets[mid] < offset) {
        if (mid === offsets.length - 2 || offsets[mid + 1] >= offset) {
          itemIndex = mid;
          break;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return itemIndex;
  }

  /**
   * Determine the maximum number of visible tracks within the viewport by
   * given track index.
   *
   * @param startIndex
   * @returns
   */
  private _maxVisibleTrackCount(startIndex: number): number {
    if (!this._viewport) return 0;

    let totalSize = 0;
    const viewportSize = this._viewport.getViewportSize();

    let index = startIndex;
    while (index < this._tracks.length && totalSize < viewportSize) {
      totalSize += this._height(this._tracks[index]);
      index++;
    }

    const visible = index - startIndex;
    return visible;
  }

  /**
   * Update the height cache with the actual height of the rendered example
   * track elements.
   *
   * @returns true if any height changed
   */
  private _updateExampleHeights(
    accumulatedSizesChanged: boolean = false,
  ): boolean {
    if (!this._wrapper || !this._viewport) return false;

    const nodes = this._wrapper.childNodes;
    let sizesChanged = false;
    let examplesMeasured = 0;

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index] as HTMLElement;
      if (
        !node ||
        !(node.nodeType === Node.ELEMENT_NODE) ||
        !node.hasAttribute('data-example-size-id')
      )
        continue;

      const id = node.getAttribute('data-example-size-id');
      if (!id) continue;

      const cachedHeight = this._heights.get(id);
      const height = node.getBoundingClientRect().height;
      examplesMeasured++;

      if (cachedHeight !== height) {
        this._heights.set(id, height);
        sizesChanged = true;
      }

      if (
        this.expectedSameSizeCount &&
        examplesMeasured >= this.expectedSameSizeCount
      )
        break;
    }

    if (sizesChanged || accumulatedSizesChanged) {
      this._updateAccumulatedTrackOffsets();
      this._updateTotalHeight();

      this._viewport.setTotalContentSize(this._totalHeight);
      this._updateMaskStyles();
    }

    return sizesChanged;
  }

  /**
   * Builds a CSS string containing classes with `--measured-mask-size` variables
   * for each measured item height, based on the `_heights` map.
   * These classes can be applied to elements to inherit the measured height.
   */
  private _buildMaskSizeStyles(): string {
    const css = Array.from(this._heights.entries())
      .map(
        ([id, height]) =>
          `.mask-size-id-${id} { --measured-mask-size: ${height}px; }`,
      )
      .join('\n');

    return css;
  }

  /**
   * Updates the contents of the dynamically injected style element
   * with the latest mask size CSS rules for measured item heights.
   */
  private _updateMaskStyles() {
    if (this._styleElement !== undefined) {
      this._styleElement.textContent = this._buildMaskSizeStyles();
    }
  }

  /**
   * Update the range of rendered tracks based on the current scroll position
   * and cached example heights. Does NOT re-measure example heights — that
   * is done exclusively by `_deferredMeasure()`.
   */
  private _updateRenderedRange() {
    if (!this._viewport) return;

    const viewportOffset = this._viewport.measureViewportOffset();
    const scrollOffset = this._viewport.measureScrollOffset();
    const scrollIndex = this._trackIndex(scrollOffset);

    const offsetScrollIndex = this._trackIndex(viewportOffset + scrollOffset);
    const totalTrackCount = this._viewport.getDataLength();

    this._updateScrollDirection();

    const visibleTrackCount = this._maxVisibleTrackCount(scrollIndex);
    const range = updatedRange(
      scrollIndex,
      visibleTrackCount,
      totalTrackCount,
      this._forwardScroll,
      this.outgoingBufferFactor,
      this.incomingBufferFactor,
    );
    const assetRange = updatedRange(
      scrollIndex,
      visibleTrackCount,
      totalTrackCount,
      this._forwardScroll,
      this.outgoingBufferFactor,
      this.incomingAssetPreparationFactor,
    );

    if (!this._viewport) return;

    // first trigger asset update 'callbacks'
    this._scrolledIndex.set(offsetScrollIndex);
    this.emitRenderedRangeChange(range);
    this.emitRenderedAssetRangeChange(assetRange);

    // scroll end/start detection — emits once each time the boundary is entered/left
    const nowAtEnd = totalTrackCount > 0 && assetRange.end >= totalTrackCount;
    const nowAtStart = totalTrackCount > 0 && assetRange.start <= 0;
    if (nowAtEnd && !this._lastScrolledToEnd) this.onScrolledToEnd?.();
    if (nowAtStart && !this._lastScrolledToStart) this.onScrolledToStart?.();
    this._lastScrolledToEnd = nowAtEnd;
    this._lastScrolledToStart = nowAtStart;

    // second update scroller content
    this._viewport.setRenderedRange(range);
    this._viewport.setRenderedContentOffset(this._offset(range.start));
  }

  /**
   * Schedules a single deferred measurement frame. All callers coalesce into
   * one rAF so that no matter how many updates arrive during a single CD
   * cycle (attach, onDataLengthChanged, updateTracks), the browser gets
   * exactly one layout-read after it has committed the DOM.
   */
  private _deferredMeasure() {
    if (!this._viewport) return;
    if (this._pendingMeasure !== null) return; // already scheduled

    this._pendingMeasure = requestAnimationFrame(() => {
      this._pendingMeasure = null;
      if (!this._viewport) return;

      // Force CDK to re-read the scrollable element's clientHeight.
      // In zoneless / OnPush apps, ngDoCheck (which normally refreshes
      // the cached viewport size) may not have run since the last browser
      // layout. checkViewportSize() also calls onDataLengthChanged() on
      // this strategy — the _refreshingViewportSize guard prevents that
      // from re-entering _deferredMeasure.
      this._refreshingViewportSize = true;
      this._viewport.checkViewportSize();
      this._refreshingViewportSize = false;

      this._updateExampleHeights(true);
      this._updateRenderedRange();
    });
  }

  /**
   * Observes the CDK wrapper element for size changes so example heights are
   * re-measured on container resize (e.g. orientation change, column count
   * change) without relying on scroll events.
   */
  private _observeWrapperResize() {
    if (!this._wrapper || this._resizeObserver) return;

    const parent = (this._wrapper as HTMLElement).parentElement;
    if (!parent) return;

    this._resizeObserver = new ResizeObserver(() => {
      // Invalidate cached heights — the container width changed so
      // CSS-driven row heights will be different.
      this._heights.clear();
      this._deferredMeasure();
    });
    this._resizeObserver.observe(parent);
  }
}
