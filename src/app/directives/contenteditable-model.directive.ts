import {Directive, ElementRef, Input, Output, EventEmitter, SimpleChanges, NgZone, ChangeDetectorRef} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Subscription} from 'rxjs/Subscription';

import * as _ from 'lodash';

@Directive({
  selector: '[contenteditableModel]'
})
export class ContenteditableModel {
  @Input('contenteditableModel') model: string;
  @Output('contenteditableModelChange') update = new EventEmitter();

  private debouncedOnKeyup: () => void;

  private keyupSubscription: Subscription;
  
  /**
   * By updating `lastViewModel` on keyup, and checking against it during `ngOnChanges`, we can rule out change events fired by our own onKeyup.
   *
   * @TODO/optimization Ideally we would not have to check against the whole string on every change, could possibly store a flag during onKeyup and test against that flag in ngOnChanges, but implementation details of Angular change detection cycle might make the not work in some edge cases? On the other hand, testing equality even for a long (15k chars) string on my machine takes about 0.00003ms per check. Also, now that `onKeyup` is debounced and outside zone, `ngOnChanges` shouldn't get called all that much anyway?
   */
  private lastViewModel: string;

  constructor(
    private elRef: ElementRef,
    private zone: NgZone,
    private changeDetector: ChangeDetectorRef
  ) {
    this.debouncedOnKeyup = _.debounce(() => {
      this.onKeyup();
      this.changeDetector.detectChanges(); // because we get called from subscription from outside zone
    }, 250, { maxWait: 1000 });
  }

  ngAfterViewInit() {
    // Even with debouncing `onKeyup`, change detection still gets called after any events fire, so on every keyup. Instead of using out-of-the-box method for listening to keyup, if we listen here outside of the zone we can control when change detection happens.
    this.zone.runOutsideAngular(() => {
      this.keyupSubscription = Observable.fromEvent(this.elRef.nativeElement, 'keyup')
        .subscribe(this.debouncedOnKeyup); // using lodash debounce instead of rxjs's so that we can do `maxWait`
    });
  }

  ngOnDestroy() {
    this.keyupSubscription.unsubscribe();
  }

  // ngDoCheck() {
  //   debugger;
  //   console.log('contenteditable model change detection');
  // }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['model'] && changes['model'].currentValue !== this.lastViewModel) {
      // model was changed by something other than ourselves
      this.lastViewModel = this.model;
      this.refreshView();
    }
  }

  onKeyup() {
    var value = this.elRef.nativeElement.innerText;
    this.lastViewModel = value;
    this.update.emit(value);
  }

  private refreshView() {
    this.elRef.nativeElement.innerText = this.model
  }
}
