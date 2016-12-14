import { Component } from '@angular/core';

/** @NOTE Empty component that we can plug into routes in order to have some route behavior (e.g. listening to URL changes, browser history, etc.) without being restricted to defining routes by a component. Primarily, there's no easy or elegant way to preserve a view when switching between routes (even if we store all the data in a service, things like scroll position, input states etc would have to saved manually... ugly). So instead we put an empty component into the router outlet, and simply use the current router URL to toggle `hidden` or use `*ngIf` on the views. For views where we don't care about persisting state, we can use the router properly. */
@Component({
  selector: 'empty-component',
  // We need a router outlet in our empty component so that we can have child routes (that use EmptyComponent) open up components in there
  template: '<router-outlet></router-outlet>'
})
export class EmptyComponent {
  constructor() {}
}
