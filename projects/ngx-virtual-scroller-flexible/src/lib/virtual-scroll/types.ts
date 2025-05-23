/**
 * A Track can represent a row or a column.
 * @param sizeId to identify tracks with the same height
 */
export abstract class Track {
  abstract trackId(): string;
  abstract sizeId(): string;
}
