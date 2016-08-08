import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

console.log('`About` component loaded');

@Component({
  selector: 'about',
  styles: [`
  `],
  template: `
    <h1>
      About component loaded!
    </h1>
  `
})
export class AboutComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`About` component initialized');
  }

}
