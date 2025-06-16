import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import {
  distinctSizeIds,
  ExampleBasedVirtualScrollDirective,
  gridTracks,
  InfiniteScrollEndComponent,
  responsiveOrthogonalTrackCount,
  Track,
} from 'ngx-virtual-scroller-flexible';
import { MyHeading } from '../models/my-heading';
import { MyImage, MyImageTrack } from '../models/my-image';
import {
  DISTINCT_SIZES,
  MyListRowComponent,
} from '../my-list-row/my-list-row.component';

@Component({
  selector: 'app-my-virtual-list',
  standalone: true,
  templateUrl: './my-virtual-list.component.html',
  styleUrls: ['./my-virtual-list.component.scss'],
  imports: [
    CommonModule,
    ScrollingModule,
    InfiniteScrollEndComponent,
    ExampleBasedVirtualScrollDirective,
    MyListRowComponent,
  ],
})
export class MyVirtualListComponent {
  private _images = signal<MyImage[]>([]);
  columns = signal<number>(1);
  loadingHistory: boolean = false;

  constructor() {
    this.fetchHistory();
  }

  tracker(index: number, track: Track) {
    return track.trackId();
  }

  updateColumns(contentRect: DOMRectReadOnly) {
    const BREAKPOINTS = [200, 400, 800, 1200];
    const size = contentRect.width;

    const columns = responsiveOrthogonalTrackCount(BREAKPOINTS, size);

    this.columns.set(columns);
  }

  public tracks = computed(() => {
    const galleryItemsValue = this.galleryGridTracks(
      this._images(),
      this.columns()
    );
    if (!galleryItemsValue) return [];

    return galleryItemsValue;
  });

  DISTINCT_SIZES = DISTINCT_SIZES;
  public sizeExamples = computed(() => {
    const distinct = distinctSizeIds(this.tracks(), DISTINCT_SIZES);

    return distinct;
  });

  fetchHistory() {
    this.loadingHistory = true;
    const limit = Math.ceil(100 * Math.random());

    setTimeout(() => {
      const images = this.fetchImages(limit);
      this._images.set(this._images().concat(images));

      this.loadingHistory = false;
    }, 500);
  }

  fetchImages(count: number) {
    function randomDate(start: Date, end: Date) {
      return new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
    }

    const randDate = randomDate(new Date(2024, 0, 1), new Date()).getTime();

    const images = Array.from({ length: count }, (_, index) => {
      return new MyImage(index.toString(), randDate, '');
    });

    return images;
  }

  /**
   * Build gallery from images. If you have a vertical scroller each track is a
   * row so the orthogonalCount would be the count of columns.
   * @param images array of images
   * @param orthogonalCount number of orthogonal tracks
   * @returns array of tracks
   */
  galleryGridTracks(images: MyImage[], orthogonalCount: number): Track[] {
    const imagesByDate = images.reduce((map, image) => {
      const date = new Date(image.timestamp).toLocaleDateString();

      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(image);

      return map;
    }, new Map<string, MyImage[]>());

    const galleryTracks = Array.from(imagesByDate.entries()).flatMap(
      ([date, dateImages]) => {
        const heading = new MyHeading(date);
        const imageTracks = gridTracks(dateImages, orthogonalCount).map(
          (trackImages) => new MyImageTrack(trackImages)
        );

        return [heading, ...imageTracks];
      }
    );

    return galleryTracks;
  }
}
