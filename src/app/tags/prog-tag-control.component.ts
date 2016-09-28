import {Component, Input, ViewChild, ElementRef} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

const ace = require('brace');

@Component({
  selector: 'prog-tag-control',
  pipes: [],
  directives: [
  ],
  template: require('./prog-tag-control.component.html')
})
export class ProgTagControlComponent {
  @Input() tag: Tag;

  @ViewChild('editorRef') editorRef: ElementRef;

  /** Holds Ace editor instance */
  private editor;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService,
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
    }
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  initializeEditor(): void {
    if (! this.editorRef) {
      return;
    }

    this.editor = ace.edit(this.editorRef.nativeElement);
    // this.editor.setTheme('ace/theme/dawn'); // @TODO/ece Lets pick a theme (later can be under user control). twilight is good. monokai is good. add in vendor.browser.ts

    const sesh = this.editor.getSession();
    sesh.setMode('ace/mode/javascript');
    sesh.setUseWrapMode(true);
    sesh.setTabSize(2);
    sesh.setUseSoftTabs(true);
    sesh.setUseWorker(true); // does syntax validation

    // this.editor.resize(); // doesn't seem necessary @TODO/now Maybe it is, word wrap isn't working when zoomed out?

    // @TODO/prog We should set a listener on any edits, and if it's changed, confirm navigation away from this tag to save and run or discard changes

    // @TODO/now this.editor.getValue() gets the contents!

    window['editor'] = this.editor; // @TODO/now Temporary
  }
}
