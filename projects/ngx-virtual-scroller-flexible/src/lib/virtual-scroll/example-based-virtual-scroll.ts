import {
  CdkVirtualScrollViewport,
  VirtualScrollStrategy,
} from '@angular/cdk/scrolling';
import { computed, EventEmitter, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, lastValueFrom, Observable, Subject } from 'rxjs';
import { Range, updatedRange } from './range';
import { Track } from './types';

export class ExampleBasedVirtualScrollStrategy
  implements VirtualScrollStrategy
{
  private _scrolledIndex = signal<number>(0);
  scrolledIndexChange = toObservable(
    computed(() => this._scrolledIndex())
  ).pipe(distinctUntilChanged());

  // public properties through scroll directive
  public expectedSameSizeCount?: number;
  public outgoingBufferFactor: number = 0.0;
  public incomingBufferFactor: number = 0.8;
  public incomingAssetPreparationFactor: number = 2;
  public resized?: EventEmitter<DOMRectReadOnly>;
  public renderedRangeChange?: EventEmitter<Range>;
  public renderedAssetRangeChange?: EventEmitter<Range>;

  private _styleElement?: HTMLStyleElement;
  private _lastScrollOffset: number = 0;
  private _forwardScroll: boolean = true;
  private _lastRenderedRange: Range = new Range(-1, -1);
  private _lastRenderedAssetRange: Range = new Range(-1, -1);

  private _viewport!: CdkVirtualScrollViewport | null;
  private _wrapper!: ChildNode | null;

  private _tracks: Track[] = [];
  private _accumulatedTrackOffsets: number[] = [];
  private _totalHeight: number = 0;
  private _heights = new Map<string, number>();

  attach(viewport: CdkVirtualScrollViewport): void {
    this._viewport = viewport;
    this._wrapper = viewport.getElementRef().nativeElement.childNodes[0];
    this._attachStyleTag(this._viewport.getElementRef().nativeElement);

    this._updateExampleHeights(true);
    this._updateRenderedRange();
  }

  private _attachStyleTag(container: HTMLElement) {
    if (this._styleElement === undefined) {
      this._styleElement = document.createElement('style');
      container.prepend(this._styleElement);
    }
  }

  detach(): void {
    this._detachStyleTag();

    this._viewport = null;
    this._wrapper = null;
  }

  private _detachStyleTag() {
    if (this._styleElement !== undefined) this._styleElement.remove();
  }

  onContentScrolled(): void {
    this._updateRenderedRange();
  }

  onDataLengthChanged(): void {
    this._updateExampleHeights(true);
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
      if (this.renderedRangeChange) this.renderedRangeChange.emit(range);
      else throw Error('Event emitter undefined.');
      this._lastRenderedRange = range;
    }
  }

  emitRenderedAssetRangeChange(range: Range) {
    if (
      !this._lastRenderedAssetRange ||
      !this._lastRenderedAssetRange.equals(range)
    ) {
      if (this.renderedAssetRangeChange)
        this.renderedAssetRangeChange.emit(range);
      else throw Error('Event emitter undefined.');
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
   *
   * @param tracks
   */
  updateTracks(tracks: Track[]): void {
    const currentIndex = this._scrolledIndex();
    const isValidIndex = 0 < currentIndex && currentIndex < this._tracks.length;

    const nextIndex = isValidIndex
      ? tracks.findIndex(
          (track) => track.trackId() === this._tracks[currentIndex].trackId()
        )
      : -1;

    this._tracks = tracks;

    this._viewport?.checkViewportSize();

    if (nextIndex > 0) this.switchToIndex(nextIndex);
  }

  /**
   * Update the measured example sizes.
   */
  remeasureExampleSizes() {
    if (this._viewport) this._viewport.checkViewportSize();
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
   * Returns the height of a given track from the heights cache. Returns
   * Infinity if height for size id is missing.
   *
   * @param track
   * @returns
   */
  private _height(track: Track): number {
    const cachedHeight = this._heights.get(track.sizeId());

    if (cachedHeight !== undefined) return cachedHeight;

    // If new tracks with not yet measured size-ids where added, then Infinity
    // makes it so that the scroller assumes, that only one Element is currently
    // visible.
    return Infinity;
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
   * Update the height cache with the actual height of the rendered track
   * components.
   *
   * @returns true if any height changed
   */
  private _updateExampleHeights(
    accumulatedSizesChanged: boolean = false
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

      if (!accumulatedSizesChanged)
        console.log(
          'Example sizes changed - this should only happen when the dimensions of the scroller change.'
        );
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
          `.mask-size-id-${id} { --measured-mask-size: ${height}px; }`
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
   * Update the range of rendered tracks.
   *
   * @returns
   */
  private _updateRenderedRange() {
    if (!this._viewport) return;

    const viewportOffset = this._viewport.measureViewportOffset();
    const scrollOffset = this._viewport.measureScrollOffset();
    const scrollIndex = this._trackIndex(scrollOffset);

    const offsetScrollIndex = this._trackIndex(viewportOffset + scrollOffset);
    const totalTrackCount = this._viewport.getDataLength();
    const oldTotalHeight = this._totalHeight;

    this._updateScrollDirection();
    const changedHeight = this._updateExampleHeights();

    if (changedHeight) {
      const newTotalHeight = this._totalHeight;
      const sizeChangeFactor = newTotalHeight / oldTotalHeight;
      const newScrollOffset = scrollOffset * sizeChangeFactor;

      this._viewport.scrollToOffset(
        viewportOffset + newScrollOffset,
        'instant'
      );
    }

    const visibleTrackCount = this._maxVisibleTrackCount(scrollIndex);
    const range = updatedRange(
      scrollIndex,
      visibleTrackCount,
      totalTrackCount,
      this._forwardScroll,
      this.outgoingBufferFactor,
      this.incomingBufferFactor
    );
    const assetRange = updatedRange(
      scrollIndex,
      visibleTrackCount,
      totalTrackCount,
      this._forwardScroll,
      this.outgoingBufferFactor,
      this.incomingAssetPreparationFactor
    );

    if (!this._viewport) return;

    this._viewport.setRenderedRange(range);
    this._viewport.setRenderedContentOffset(this._offset(range.start));

    this._scrolledIndex.set(offsetScrollIndex);
    this.emitRenderedRangeChange(range);
    this.emitRenderedAssetRangeChange(assetRange);
  }
}
