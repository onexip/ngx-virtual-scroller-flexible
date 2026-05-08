import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
} from '@angular/core';

@Directive({
  selector: '[appResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective {
  /**
   * Emits the contentRect (DOMRectReadOnly) of the observed element
   * whenever a resize occurs.
   */
  readonly resized = output<DOMRectReadOnly>();

  private readonly _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const observer = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          this.resized.emit(entries[0].contentRect);
        }
      });
      observer.observe(this._elementRef.nativeElement);
      this._destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
