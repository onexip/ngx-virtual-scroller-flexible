# ngx-virtual-scroller-flexible

[![npm version](https://img.shields.io/npm/v/@onexip/ngx-virtual-scroller-flexible.svg)](https://www.npmjs.com/package/@onexip/ngx-virtual-scroller-flexible)
[![Angular](https://img.shields.io/badge/Angular-19%2B-dd0031.svg)](https://angular.dev)

An ultra-fast, flexible virtual scroller for Angular that renders unlimited items with **variable heights** and **multi-column layouts**. Built on top of Angular CDK's `CdkVirtualScrollViewport` with a custom scroll strategy that measures actual DOM element sizes.

Perfect for image galleries, product grids, chat feeds, or any list where items have different heights.

## Features

- **Variable-height items** — measures real DOM elements instead of requiring fixed row heights
- **Multi-column grid layouts** — responsive column count based on container width
- **Configurable buffer zones** — separate incoming/outgoing buffer factors for smooth scrolling
- **Infinite scroll** — built-in `scrolledToEnd` / `scrolledToStart` events for loading more data
- **Inverted scrolling** — for chat-style bottom-to-top layouts
- **Resize-aware** — automatically remeasures when the viewport resizes
- **Standalone** — works with Angular's standalone component architecture
- **Zoneless-compatible** — works with `provideZonelessChangeDetection()`

## Installation

```bash
npm install @onexip/ngx-virtual-scroller-flexible
```

### Peer dependencies

| Package | Version |
|---|---|
| `@angular/core` | `^20.0.0 \|\| ^21.0.0` |
| `@angular/common` | `^20.0.0 \|\| ^21.0.0` |
| `@angular/cdk` | `^20.0.0 \|\| ^21.0.0` |

## Quick start

### 1. Define your Track models

Every item in the scroller must extend the `Track` class:

```typescript
import { Track } from '@onexip/ngx-virtual-scroller-flexible';

export class ImageTrack extends Track {
  constructor(public images: Image[], public columns: number) {
    super();
  }

  trackId(): string {
    return this.images.map(img => img.id).join('-');
  }

  // Tracks with the same sizeId are assumed to have the same height.
  // The scroller measures one example per sizeId.
  sizeId(): string {
    return 'image-row';
  }
}
```

### 2. Set up the component

```typescript
import { Component, computed, signal } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import {
  ExampleBasedVirtualScrollDirective,
  InfiniteScrollEndComponent,
  distinctSizeIds,
  gridTracks,
  responsiveOrthogonalTrackCount,
  Track,
} from '@onexip/ngx-virtual-scroller-flexible';

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [
    ScrollingModule,
    ExampleBasedVirtualScrollDirective,
    InfiniteScrollEndComponent,
    MyRowComponent,
  ],
  templateUrl: './my-list.component.html',
})
export class MyListComponent {
  private images = signal<Image[]>([]);
  columns = signal(1);

  tracks = computed(() =>
    gridTracks(this.images(), this.columns())
      .map(group => new ImageTrack(group, this.columns()))
  );

  // Number of distinct sizeIds your tracks produce
  readonly DISTINCT_SIZES = 1;

  sizeExamples = computed(() =>
    distinctSizeIds(this.tracks(), this.DISTINCT_SIZES)
  );

  tracker = (index: number, track: Track) => track.trackId();

  updateColumns(contentRect: DOMRectReadOnly) {
    const breakpoints = [400, 800, 1200];
    this.columns.set(responsiveOrthogonalTrackCount(breakpoints, contentRect.width));
  }

  fetchMore() {
    // Load next page of data
  }
}
```

### 3. Set up the template

```html
<div class="scroller-container" cdkVirtualScrollingElement>
  <cdk-virtual-scroll-viewport
    appExampleBasedVirtualScroll
    [tracks]="tracks()"
    [expectedSameSizeCount]="DISTINCT_SIZES"
    [outgoingBufferFactor]="0.5"
    [incomingBufferFactor]="1.5"
    (resized)="updateColumns($event)"
  >
    <!-- Size examples: invisible elements measured by the strategy.
         One per distinct sizeId. Must have the data-example-size-id attribute. -->
    @for (track of sizeExamples(); track track.trackId()) {
      <app-my-row
        [attr.data-example-size-id]="track.sizeId()"
        [track]="track"
        class="row"
      />
    }

    <!-- Virtualized content -->
    <app-my-row
      *cdkVirtualFor="let track of tracks(); trackBy: tracker"
      [track]="track"
      class="row"
    />
  </cdk-virtual-scroll-viewport>

  <app-infinite-scroll-end
    [earlyTriggerFactor]="2"
    (endReached)="fetchMore()"
  />
</div>
```

## API

### `ExampleBasedVirtualScrollDirective`

Directive selector: `[appExampleBasedVirtualScroll]`

Applied to `<cdk-virtual-scroll-viewport>`, it provides a custom `VIRTUAL_SCROLL_STRATEGY` that measures example DOM elements to determine item heights.

#### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `tracks` | `Track[]` | `[]` | The array of track items to scroll over |
| `expectedSameSizeCount` | `number` | `undefined` | Number of distinct size groups — stops measuring early when all groups are found |
| `outgoingBufferFactor` | `number` | `0.0` | Buffer behind the scroll direction as a factor of viewport height |
| `incomingBufferFactor` | `number` | `0.8` | Buffer ahead of the scroll direction as a factor of viewport height |
| `incomingAssetPreparationFactor` | `number` | `2` | Asset preparation range ahead of scroll as a factor of viewport height |
| `invertedScrolling` | `boolean` | `false` | Invert scroll direction (for bottom-to-top layouts) |
| `triggerRemeasure` | `boolean` | `false` | Toggle to force remeasurement of example element sizes |

#### Outputs

| Output | Type | Description |
|---|---|---|
| `renderedRangeChange` | `Range` | Emits when the rendered track range changes |
| `renderedAssetRangeChange` | `Range` | Emits when the asset preparation range changes |
| `scrolledToEnd` | `void` | Emits once when the asset range reaches the last track |
| `scrolledToStart` | `void` | Emits once when the asset range reaches the first track |

### `InfiniteScrollEndComponent`

Selector: `<app-infinite-scroll-end>`

Place below the viewport to trigger data loading when the user approaches the end.

| Input | Type | Default | Description |
|---|---|---|---|
| `earlyTriggerFactor` | `number` | `1` | How early to trigger (multiplied by viewport height) |
| `loading` | `boolean` | `false` | Suppresses the trigger while data is being fetched |

| Output | Type | Description |
|---|---|---|
| `endReached` | `void` | Emits when the scroll position is near the end |

### Utility functions

| Function | Description |
|---|---|
| `distinctSizeIds(tracks, expectedCount?)` | Returns tracks with unique `sizeId` values (for size examples) |
| `gridTracks(elements, columns)` | Chunks a flat array into a 2D grid |
| `responsiveOrthogonalTrackCount(breakpoints, containerSize)` | Returns column count based on container width and breakpoints |

### `Track` (abstract class)

Base class for all items in the scroller.

| Method | Returns | Description |
|---|---|---|
| `trackId()` | `string` | Unique identifier for change tracking |
| `sizeId()` | `string` | Groups items with the same height — the strategy measures one example per group |

## How it works

Unlike fixed-height virtual scrollers, this library uses **example-based measurement**:

1. You provide invisible "example" elements — one per distinct `sizeId` — inside the viewport
2. The strategy measures their actual rendered height via `getBoundingClientRect()`
3. It uses those heights to calculate accumulated offsets and determine which tracks are visible
4. On scroll, it updates the rendered range and applies CSS transforms for positioning

This means your items can have any height — headings, image rows, ads — as long as items with the same `sizeId` have the same height.

## Example

A full working example is included in the source under [`src/example-usage/`](https://github.com/onexip/ngx-virtual-scroller-flexible/tree/main/projects/ngx-virtual-scroller-flexible/src/example-usage).

## Version compatibility

| Library | Angular |
|---|---|
| `1.0.0` – `1.0.3`, `1.0.5` | Angular 19 |
| `1.0.4`, `1.0.6`, `1.0.7` | Angular 20 |
| `20.x` | Angular 20 (major-aligned versioning) |
| `21.x` | Angular 21 |

Starting with version 20.0.0, the library follows **Angular-major-aligned versioning** — the library major version matches the Angular major version it targets.

## Migration from 1.0.x to 20.x / 21.x

### Breaking changes

#### Signal-based API

All `@Input()` / `@Output()` decorators have been replaced with Angular's signal-based API (`input()`, `output()`, `model()`). If you were passing inputs programmatically via `component.someInput = value`, update to use the signal write API or template bindings. Template usage (`[input]="value"` / `(output)="handler($event)"`) continues to work unchanged.

#### `InfiniteScrollEndComponent` — `(endReached)` removed

The `(endReached)` output and `[earlyTriggerFactor]` input have been removed from `InfiniteScrollEndComponent`. Scroll-end detection now lives in the directive itself:

```html
<!-- Before (1.0.x) -->
<infinite-scroll-end [loading]="loading" (endReached)="onEnd()"></infinite-scroll-end>

<!-- After (20.x / 21.x) -->
<div [exampleBasedVirtualScroll]="strategy" (scrolledToEnd)="onEnd()">
  ...
  <infinite-scroll-end [loading]="loading"></infinite-scroll-end>
</div>
```

#### New features in 20.x / 21.x

- `(scrolledToEnd)` / `(scrolledToStart)` outputs on the directive
- `[invertedScrolling]` input for bottom-to-top scroll order
- `resetScrollEndDetection()` method on the directive to re-arm the end trigger
- `switchToIndex()` on the strategy for scroll-position locking (e.g. after prepending items)

## Development

```bash
# Build the library in watch mode and push to yalc
npm run watch:yalc:push
```

> **Note:** `npm link` does not work reliably with Angular lifecycle hooks — use [yalc](https://www.divotion.com/blog/yalc-npm-link-alternative-that-does-work) for local development instead.

In the target project:

```bash
yalc add ngx-virtual-scroller-flexible
npm install
```

On every change in the library, stop the frontend, reinstall, and restart:

```bash
npm install && npm start
```

## License

This library is licensed under [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) and can be used for free in non-commercial open source products. Please [contact us](https://www.onexip.com) if you want to use this library in commercial applications.

## Copyright

(c) 2024–2026 [onexip GmbH](https://www.onexip.com)