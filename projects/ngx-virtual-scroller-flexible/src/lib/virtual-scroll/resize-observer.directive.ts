import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective implements OnInit, OnDestroy {
  /**
   * Emits the contentRect (DOMRectReadOnly) of the observed element
   * whenever a resize occurs.
   */
  @Output() resized = new EventEmitter<DOMRectReadOnly>();

  private resizeObserver: ResizeObserver | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        this.resized.emit(entries[0].contentRect);
      }
    });

    this.resizeObserver.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
