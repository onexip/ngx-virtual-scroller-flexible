import {
  CdkVirtualScrollViewport,
  VirtualScrollStrategy,
} from '@angular/cdk/scrolling';
import { EventEmitter } from '@angular/core';
import { distinctUntilChanged, Observable, Subject } from 'rxjs';
import { Range, updatedRange } from './range';
import { Track } from './types';

export class ExampleBasedVirtualScrollStrategy
  implements VirtualScrollStrategy
{
  _scrolledIndexChange$ = new Subject<number>();
  scrolledIndexChange: Observable<number> = this._scrolledIndexChange$.pipe(
    distinctUntilChanged()
  );

  // public properties through scroll directive
  public expectedSameSizeCount?: number;
  public outgoingBufferFactor: number = 0.5;
  public incomingBufferFactor: number = 1.5;
  public resized?: EventEmitter<DOMRectReadOnly>;
  public renderedRangeChange?: EventEmitter<[Range, Range]>;

  private _resizeObserver?: ResizeObserver;
  private _lastScrollOffset: number = 0;
  private _forwardScroll: boolean = true;
  private _lastRenderedRange: Range = new Range(-1, -1);

  private _viewport!: CdkVirtualScrollViewport | null;
  private _wrapper!: ChildNode | null;

  private _tracks: Track[] = [];
  private _heights = new Map<string, number>();

  attach(viewport: CdkVirtualScrollViewport): void {
    this._viewport = viewport;
    this._wrapper = viewport.getElementRef().nativeElement.childNodes[0];
    this.attachResizeObserver();
    this._updateExampleHeights();
    this._viewport.setTotalContentSize(this._totalHeight(this._tracks));

    this._updateRenderedRange();
  }

  private attachResizeObserver() {
    if (!this._viewport) return;

    this._resizeObserver = new ResizeObserver((entries) => {
      const contentRect = entries[0].contentRect;

      if (this.resized) this.resized.emit(contentRect);
    });
    this._resizeObserver.observe(this._viewport.elementRef.nativeElement);
  }

  detach(): void {
    this.detachResizeObserver();

    this._viewport = null;
    this._wrapper = null;
  }

  private detachResizeObserver() {
    if (this._resizeObserver) {
      if (this._viewport)
        this._resizeObserver.unobserve(this._viewport.elementRef.nativeElement);
      this._resizeObserver = undefined;
    }
  }

  onContentScrolled(): void {
    if (!this._viewport) return;

    this._updateScrollDirection();
    this._updateRenderedRange();
  }

  onDataLengthChanged(): void {
    if (!this._viewport) return;

    this._viewport.setTotalContentSize(this._totalHeight(this._tracks));
    this._updateRenderedRange();
  }

  onContentRendered(): void {
    /** no-op */
  }

  onRenderedOffsetChanged(): void {
    /** no-op */
  }

  emitRenderedRangeChange(range: Range) {
    if (!this._lastRenderedRange || !this._lastRenderedRange.equals(range)) {
      if (this.renderedRangeChange)
        this.renderedRangeChange.emit([this._lastRenderedRange, range]);
      else throw Error('Event emitter undefined.');
      this._lastRenderedRange = range;
    }
  }

  scrollToIndex(index: number, behavior: ScrollBehavior): void {
    if (!this._viewport) return;

    const startOffset = this._startOffset();
    const heightsOffset = this._offset(index);
    const offset = startOffset + heightsOffset;

    this._viewport.scrollToOffset(offset, behavior);
  }

  /**
   * Update the tracks array.
   *
   * @param tracks
   */
  updateTracks(tracks: Track[]) {
    this._tracks = tracks;

    if (this._viewport) this._viewport.checkViewportSize();
  }

  /**
   * Updates the current scroll direction and the last scroll offset position.
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
   * Returns the height of a given track from the heights cache. Throws if
   * height for size id is missing.
   *
   * @param track
   * @returns
   */
  private _height(track: Track): number {
    const cachedHeight = this._heights.get(track.sizeId());

    if (cachedHeight === undefined)
      throw new Error(`Example height missing for size id: ${track.sizeId()}`);

    return cachedHeight;
  }

  /**
   * Returns total height of given tracks.
   *
   * (Does only account for offsets that are part of the viewport/content
   * wrapper. Pre-Viewport/Scrollable offsets are irrelevant.)
   *
   * @param tracks
   * @returns
   */
  private _totalHeight(tracks: Track[]): number {
    if (!this._viewport) return 0;

    const total = tracks
      .map((track) => this._height(track))
      .reduce((accumulated, value) => accumulated + value, 0);

    return total;
  }

  /**
   * Returns the offset relative to the top of the container by a provided track
   * index.
   * (Does only account for offsets that are part of the viewport/content wrapper. Pre-Viewport/Scrollable offsets are irrelevant.)
   *
   * @param index
   * @returns
   */
  private _offset(index: number): number {
    const offset = this._totalHeight(this._tracks.slice(0, index));
    return offset;
  }

  /**
   * Returns the track index by a provided offset.
   *
   * @param offset
   * @returns
   */
  private _trackIndex(offset: number): number {
    let accumulatedOffset = 0;

    for (let index = 0; index < this._tracks.length; index++) {
      const track = this._tracks[index];
      const trackHeight = this._height(track);

      accumulatedOffset += trackHeight;

      if (accumulatedOffset >= offset) return index;
    }

    return 0;
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
   * Update the height cache with the actual height of the rendered track
   * components.
   *
   * @returns
   */
  private _updateExampleHeights() {
    if (!this._wrapper || !this._viewport) return;

    const nodes = this._wrapper.childNodes;
    let sizesChanged = false;
    let examplesMeasured = 0;

    // NOTE: One could add early return if one knew how many different heights are expected...

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

      this._heights.set(id, height);
      examplesMeasured++;
      if (cachedHeight !== height) sizesChanged = true;

      if (
        this.expectedSameSizeCount &&
        examplesMeasured >= this.expectedSameSizeCount
      )
        break;
    }

    if (sizesChanged)
      this._viewport.setTotalContentSize(this._totalHeight(this._tracks));
  }

  /**
   * Update the range of rendered tracks.
   *
   * @returns
   */
  private _updateRenderedRange() {
    if (!this._viewport) return;

    const scrollOffset = this._viewport.measureScrollOffset();
    const scrollIndex = this._trackIndex(scrollOffset);
    const visibleTrackCount = this._maxVisibleTrackCount(scrollIndex);
    const totalTrackCount = this._viewport.getDataLength();

    this._updateExampleHeights();

    const range = updatedRange(
      scrollIndex,
      visibleTrackCount,
      totalTrackCount,
      this._forwardScroll,
      this.outgoingBufferFactor,
      this.incomingBufferFactor
    );

    this._viewport.setRenderedRange(range);
    this._viewport.setRenderedContentOffset(this._offset(range.start));

    this._scrolledIndexChange$.next(scrollIndex);
    this.emitRenderedRangeChange(range);
  }
}
