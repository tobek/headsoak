import {Component, ViewChild, ElementRef/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account/';
import {Tag, SubTag, TagComponent} from '../tags/';

@Component({
  selector: 'homepage',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    TagComponent,
  ],
  templateUrl: './homepage.component.html'
})
export class HomepageComponent {
  tags: Tag[] = [];

  @ViewChild('noteBody') noteBody: ElementRef;
  @ViewChild('noteTags') noteTags: ElementRef;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService
   ) {}

  ngAfterViewInit() {
    this.write('This is some great, awesome, happy text in a note!', 0, () => {
      const sent = new Tag ({
        id: 'hp-tag-1',
        name: 'sentiment',
        prog: true,
      }, null);
      const sentPos = new SubTag('positive', sent);

      this.tags = [sentPos];
    });
  }

  write(str: string, i = 0, cb?: Function) {
    if (str.length <= i++) {
      this.noteBody.nativeElement.value = str;

      if (cb) {
        cb();
      }

      return;
    }

    this.noteBody.nativeElement.value = str.substring(0, i);

    // @TODO/now Stop doing this if user focuses elsewhere
    this.noteBody.nativeElement.focus();

    let delay = Math.floor(Math.random() * (50)) + 25;

    if (str[i - 1] === ',') {
      delay += 150;
    }
    else if (str[i - 1] === '.' || str[i - 1] === '!' || str[i - 1] === '?') {
      delay += 250;
    }

    setTimeout(() => {
      this.write(str, i, cb);
    }, delay);
  }


}
