import { Track } from 'ngx-virtual-scroller-flexible';

export class MyImage {
  public id: string;
  public timestamp: number;
  public filepath?: string;

  constructor(id: string, timestamp: number, filepath?: string) {
    this.id = id;
    this.timestamp = timestamp;
    this.filepath = filepath;
  }
}

export class MyImageTrack extends Track {
  public images: MyImage[];

  constructor(images: MyImage[]) {
    super();
    this.images = images;
  }

  public override trackId(): string {
    return this.images[0].id;
  }

  public override sizeId(): string {
    return 'image-track';
  }
}

export function isMyImageTrack(item: Track): item is MyImageTrack {
  return item instanceof MyImageTrack;
}
