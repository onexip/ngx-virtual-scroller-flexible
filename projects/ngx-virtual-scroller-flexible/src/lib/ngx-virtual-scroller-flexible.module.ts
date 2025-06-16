import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExampleBasedVirtualScrollDirective } from './virtual-scroll/example-based-virtual-scroll.directive';

@NgModule({
  declarations: [],
  imports: [CommonModule, ExampleBasedVirtualScrollDirective],
  exports: [ExampleBasedVirtualScrollDirective],
})
export class NgxVirtualScrollerFlexibleModule {}
