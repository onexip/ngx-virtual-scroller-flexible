import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-infinite-scroll-end',
  templateUrl: './infinite-scroll-end.component.html',
  styleUrl: './infinite-scroll-end.component.scss',
  imports: [CommonModule],
})
export class InfiniteScrollEndComponent implements OnInit, OnDestroy {
  /**
   * Trigger endReached event before reaching the scroll content end. The
   * visible height of the scroll container is multiplied by this factor. The
   * result is the size in pixels at which the event is triggered before the
   * content end is reached.
   *
   * At 1000 px scroll container height and a factor of 0.5 the end event will
   * be triggered 500px before the content end. This way new content can already
   * be fetched while the user still has some content to scroll.
   */
  @Input() earlyTriggerFactor: number = 0;
  @Input({ required: true }) loading!: boolean;

  @Output() endReached = new EventEmitter<void>();
  private _unListen!: () => void;
  private _endTriggered: boolean = false;

  constructor(private _elRef: ElementRef, private _renderer: Renderer2) {}

  ngOnInit() {
    const parent = this._elRef.nativeElement.parentElement;
    this._unListen = this._renderer.listen(
      parent,
      'scroll',
      this._scrollAction
    );
  }

  ngOnDestroy() {
    this._unListen();
  }

  /**
   * Handles scroll events and triggers the `endReached` event when the user
   * scrolls near the end.
   *
   * - Returns early if already loading.
   * - Calculates scroll position and checks if the end has been reached.
   * - Emits the `endReached` event when triggered, ensuring it only fires once
   *   per reach.
   */
  private _scrollAction = (event: Event) => {
    if (this.loading) {
      this._endTriggered = false;
      return;
    }

    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop + target.clientHeight;
    const triggerBuffer = target.clientHeight * this.earlyTriggerFactor;

    const endReached = scrollTop + triggerBuffer >= target.scrollHeight;

    if (endReached) {
      if (!this._endTriggered) {
        this._endTriggered = true;
        this.endReached.emit();
      }
    } else this._endTriggered = false;
  };
}
