import { Track } from './types';

/**
 * Filters an array of Track objects to return those with distinct sizeId values.
 * Stops early if an expected number of distinct results is reached.
 *
 * @param tracks - The array of Track objects to filter.
 * @param expectedCount - Optional limit on the number of distinct results to return.
 * @returns An array of Track objects with unique sizeId values.
 */
export function distinctSizeIds(
  tracks: Track[],
  expectedCount?: number
): Track[] {
  const distinct = new Set<string>();
  const filtered: Track[] = [];

  for (const track of tracks) {
    const sizeId = track.sizeId();

    if (distinct.has(sizeId)) continue;

    distinct.add(sizeId);
    filtered.push(track);

    if (expectedCount !== undefined && filtered.length >= expectedCount) break;
  }

  return filtered;
}

/**
 * Wraps elements at a specified count into a grid.
 * ```ts
 * gridTracks([1, 2, 3, 4, 5, 6, 7], 3)
 * [
 *   [1, 2, 3],
 *   [4, 5, 6],
 *   [7]
 * ]
 * ```
 * @param elements - The array of elements to organize.
 * @param orthogonalCount - The number of elements per track (e.g., row or
 *   column).
 * @returns A 2D array where each inner array contains up to `orthogonalCount`
 *   elements.
 */
export function gridTracks<T>(elements: T[], orthogonalCount: number) {
  const trackCount = Math.ceil(elements.length / orthogonalCount);

  return Array.from({ length: trackCount }, (_, i) =>
    elements.slice(i * orthogonalCount, (i + 1) * orthogonalCount)
  );
}

/**
 * Returns the number of orthogonal tracks based on container size and
 * breakpoints.
 *
 * ```ts
 * responsiveOrthogonalTrackCount([400, 800, 1200], 500); // 2
 * ```
 * @param breakpoints - Ascending array of breakpoints.
 * @param containerSize - The container size to evaluate.
 * @returns Track count based on the matching breakpoint.
 */
export function responsiveOrthogonalTrackCount(
  breakpoints: number[],
  containerSize: number
) {
  return (
    breakpoints.findIndex((breakpoint) => containerSize < breakpoint) + 1 ||
    breakpoints.length + 1
  );
}
