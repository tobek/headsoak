import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'settings',
  styles: [
    // require('./settings.component.css')
  ],
  template: require('./settings.component.html')
})
export class SettingsComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`Settings` component initialized');
  }

}
