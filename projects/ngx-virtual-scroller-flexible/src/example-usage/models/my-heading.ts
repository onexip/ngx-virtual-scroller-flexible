import { Track } from 'ngx-virtual-scroller-flexible';

export class MyHeading extends Track {
  public text: string;
  public level: number;

  constructor(text: string, level: number = 1) {
    super();
    this.text = text;
    this.level = level;
  }

  public override trackId(): string {
    return this.text;
  }

  public override sizeId(): string {
    return `heading-h${this.level}`;
  }
}

export function isMyHeading(item: Track): item is MyHeading {
  return item instanceof MyHeading;
}
