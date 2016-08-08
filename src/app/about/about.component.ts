import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

console.log('`About` component loaded');

@Component({
  selector: 'about',
  styles: [`
  `],
  template: `
    <h1>
      This component is loaded!
    </h1>
  `
})
export class About {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`About` component initialized');
  }

}
