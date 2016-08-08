import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'shortcuts',
  styles: [`
  `],
  template: `
    <h1>
      Shortcuts!
    </h1>
  `
})
export class ShortcutsComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`Shortcuts` component initialized');
  }

}
