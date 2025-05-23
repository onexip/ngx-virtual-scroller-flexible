import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';
import { Track } from 'ngx-virtual-scroller-flexible';
import { isMyHeading } from '../models/my-heading';
import { isMyImageTrack, MyImageTrack } from '../models/my-image';

// Number of different track sizes. (Allows for early returns.)
export const DISTINCT_SIZES = 3;

@Component({
  selector: 'app-my-list-row',
  standalone: true,
  templateUrl: './my-list-row.component.html',
  imports: [CommonModule],
})
export class MyListRowComponent {
  @Input({ required: true })
  track!: Track;

  @Input()
  public columns = 1;

  @HostBinding('style.--columns')
  get columnCount() {
    if (this.isMyHeading(this.track)) return 1;
    return this.columns;
  }

  constructor() {}

  isMyHeading = isMyHeading;
  isMyImageTrack = isMyImageTrack;

  images(track: MyImageTrack) {
    return track.images;
  }
}
