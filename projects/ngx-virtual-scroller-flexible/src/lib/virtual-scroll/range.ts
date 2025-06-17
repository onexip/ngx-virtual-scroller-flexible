/**
 * Represents a range with a start and end index.
 */
export class Range {
  public start: number;
  public end: number;

  /**
   * Constructs a Range instance.
   * @param start - The starting index of the range.
   * @param end - The ending index of the range. (exclusive -> index = first
   * invisible)
   */
  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }

  equals(other: Range): boolean {
    return this.start === other.start && this.end === other.end;
  }
}

/**
 * Calculates an updated range of indices based on scroll preparation
 * factors.
 *
 * @param scrollIndex - The current scroll position index.
 * @param visibleItemCount - The number of visible items in the viewport.
 * @param totalItemCount - The total number of items in the list.
 * @param scrollingForward - Whether the user is scrolling forward (true) or
 * backward (false). Forward means away from the scrolling start to reveal the
 * following content.
 * @param outgoingBufferFactor - The factor determining the buffer size before
 * the visible range when scrolling forward.
 * @param incomingBufferFactor - The factor determining the buffer size after
 * the visible range when scrolling forward.
 * @returns A `Range` object representing the updated start and end indices.
 */
export function updatedRange(
  scrollIndex: number,
  visibleItemCount: number,
  totalItemCount: number,
  scrollingForward: boolean,
  outgoingBufferFactor: number,
  incomingBufferFactor: number
) {
  const bufferBefore = Math.ceil(
    (scrollingForward ? outgoingBufferFactor : incomingBufferFactor) *
      visibleItemCount
  );
  const bufferAfter = Math.ceil(
    (scrollingForward ? incomingBufferFactor : outgoingBufferFactor) *
      visibleItemCount
  );

  const range = new Range(
    Math.max(0, scrollIndex - bufferBefore),
    // + 1 as Range.end is exclusive
    Math.min(totalItemCount, scrollIndex + 1 + visibleItemCount + bufferAfter)
  );

  return range;
}
