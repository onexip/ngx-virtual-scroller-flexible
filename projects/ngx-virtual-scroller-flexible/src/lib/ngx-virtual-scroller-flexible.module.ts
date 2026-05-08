import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { InfiniteScrollEndComponent } from './infinite-scroll-end/infinite-scroll-end.component';
import { ExampleBasedVirtualScrollDirective } from './virtual-scroll/example-based-virtual-scroll.directive';
import { ResizeObserverDirective } from './virtual-scroll/resize-observer.directive';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ExampleBasedVirtualScrollDirective,
    InfiniteScrollEndComponent,
    ResizeObserverDirective,
  ],
  exports: [
    ExampleBasedVirtualScrollDirective,
    InfiniteScrollEndComponent,
    ResizeObserverDirective,
  ],
})
export class NgxVirtualScrollerFlexibleModule {}
