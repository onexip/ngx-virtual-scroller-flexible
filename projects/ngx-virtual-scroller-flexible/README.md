# ngx-virtual-scroller-flexible

The `ngx-virtual-scroller-flexible` is an ultra fast and flexible virtual scroller which can render an unlimited set of items with different heights perfectly.

## Approach

This virtualer scroller library displays a virtual, "infinite" list which supports showing an unlimited number of items (e.g. images) without increasing the DOM and the memory usage. Its perfect to show images in images galleries or products in online shops. "ngx-virtual-scroller-flexible" supports variable heights of items and multi-column layouts.

## License

This library is license under [GPL](https://de.wikipedia.org/wiki/GNU_General_Public_License) and can be used for free in non-commercial open source products. Please contact us if you wan't to use this library in commercial applications.

## Copyright

(c) 2024-2025 onexip GmbH. https://www.onexip.com



## Features

Virtual Scroller implemented with angular-cdk virtual scroll with the features:
- Infinite Scroll with end-reached/fetch-next trigger
- Virtualization
- Responsive-Layout (Column-Size + Count)
- Variable Item-Heights via example measuring

## Development

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

- For this package:
  - Have yalc globally installed
    - Unfortunately `npm link` does not work because of angular lifecycle hooks, thats why we need yalc for local development
    - `npm install -g yalc`
  - Build the package with
    - `npm run watch:yalc:push`

- In the target project:
  - `yalc add ngx-virtual-scroller-flexible`
  - `npm install`
  - `npm list` - to check for errors
  - On every change in the ngx-virtual-scroller-flexible package you need to:
    - Stop the frontend web server,
    - Reinstall the package via `npm install`
    - Restart the frontend
    - Or all in one: [Ctrl+C] `npm install && npm start`

### YALC

Use yacl for development:
https://www.divotion.com/blog/yalc-npm-link-alternative-that-does-work

## Usage

Find an example of how to connect everything in this packages example directory:

`./ngx-virtual-scroller-flexible/projects/ngx-virtual-scroller-flexible/src/example-usage`

There you can see how to use the component with all it's features.
