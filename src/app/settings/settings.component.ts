import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'settings',
  styles: [`
  `],
  template: `
    <h1>
      Settings
    </h1>
  `
})
export class SettingsComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`Settings` component initialized');
  }

}
