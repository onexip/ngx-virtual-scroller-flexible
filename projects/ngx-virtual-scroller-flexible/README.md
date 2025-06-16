# ngx-virtual-scroller-flexible

Virtual Scroller implemented with angular-cdk virtual scroll with the features:
- Infinite Scroll with end-reached/fetch-next trigger
- Virtualization
- Responsive-Layout (Column-Size + Count)
- Variable Item-Heights via example measuring


## Development

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


## Usage

Find an example of how to connect everything in this packages example directory:

`./ngx-virtual-scroller-flexible/projects/ngx-virtual-scroller-flexible/src/example-usage`

There you can see how to use the component with all it's features.


-----------------------------------------------------------------------------------------------------

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.6.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### YALC

Use yacl for development:
https://www.divotion.com/blog/yalc-npm-link-alternative-that-does-work

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
