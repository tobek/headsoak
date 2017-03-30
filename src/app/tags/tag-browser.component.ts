import {Inject, forwardRef, Component, ElementRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {ActiveUIsService} from '../active-uis.service';
import {SettingsService} from '../settings/settings.service';
// import {Note} from '../notes/note.model';
// import {NoteComponent} from '../notes/note.component';
// import {NotesService} from '../notes/notes.service';
import {Tag, TagComponent} from './';
import {SortOption} from '../data.service';
import {TagDetailsComponent} from './tag-details.component';
import {TagsService} from './tags.service'; // no idea why importing this separately is necessary
import {Logger/*, ScrollMonitorService, AutocompleteService*/} from '../utils/';
import {ScrollMonitorService, SizeMonitorService} from '../utils/';

import * as $ from 'jquery';
import * as _ from 'lodash';

@Component({
  selector: 'tag-browser',
  templateUrl: './tag-browser.component.html'
})
export class TagBrowserComponent {
  DEFAULT_TAGS_LIMIT: number = Infinity; // @TODO/tags There should prob be a limit?

  el: HTMLElement;

  _tags: Tag[] = [];
  /** Tags currently being displayed in the tag browser list. */
  get tags(): Tag[] {
    return this._tags;
  }
  set tags(tags: Tag[]) {
    this._tags = _.filter(tags, (tag) => tag && ! tag.parentTag);
  }

  activeTag: Tag; // Tag that's currently being show in details view
  hoveredTag?: Tag; // Tag that's currently hovered in the tag list (used to highlight tag in the visualization)
  expandedTag?: Tag; // Tag that's currently expanded to show rename/delete/explore/etc

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_TAGS_LIMIT;

  /** How tags in this list component are sorted on init. */
  sortOpt: SortOption = this.tagsService.sortOpts[0];

  /** Whether tag browser is shown alongside notes as a sidebar (`true`) or we're in full-page browsing of tags (`false`). */
  inSidebar = true;

  activePane: 'tagDetails' | 'viz' | 'library';
  activeTagPane: string; // Which pane of the active tag is open - mirroed from tagDetailsComponent

  addingNewTag = false;

  searchBarFocused = false;

  @ViewChild('mainTagList') mainTagListRef: ElementRef;
  @ViewChild('queryInput') queryInput: ElementRef;
  @ViewChildren(TagComponent) tagComponents: QueryList<TagComponent>;
  @ViewChild(TagDetailsComponent) tagDetailsComponent: TagDetailsComponent;

  query = '';
  private queryUpdated$: Subject<void> = new Subject<void>();

  private subscriptions: Subscription[] = [];

  // private _logger: Logger = new Logger('TagBrowserComponent');

  constructor(
    @Inject(forwardRef(() => SizeMonitorService)) public sizeMonitor: SizeMonitorService,
    @Inject(forwardRef(() => TagsService)) public tagsService: TagsService,
    private router: Router,
    private elRef: ElementRef,
    @Inject(forwardRef(() => ScrollMonitorService)) private scrollMonitor: ScrollMonitorService,
    private analyticsService: AnalyticsService,
    private activeUIs: ActiveUIsService,
    @Inject(forwardRef(() => SettingsService)) private settings: SettingsService
    // private autocompleteService: AutocompleteService,
    // private notesService: NotesService,
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire.
    this.subscriptions.push(this.tagsService.initialized$.subscribe(this.initTags.bind(this)));

    this.subscriptions.push(this.queryUpdated$
      .debounceTime(200)
      .subscribe(() => {
        // @TODO/tags Ideally this should use fuzzy match sorter (and bold matching parts of tag names)
        let queriedTags = _.filter(this.tagsService.tags, (tag: Tag) => {
          if (tag.internal) {
            return false;
          }

          return tag.name.toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
        });
        this.tags = this.tagsService.sortTags(this.sortOpt, queriedTags);
      })
    );

    this.subscriptions.push(this.tagsService.tagCreated$.subscribe(this.queryUpdated.bind(this)));
    this.subscriptions.push(this.tagsService.tagDeleted$.subscribe(this.tagDeleted.bind(this)));

    // this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  ngAfterViewInit() {
    this.setMainTagListWidth();
    this.subscriptions.push(this.sizeMonitor.resize$.subscribe(this.setMainTagListWidth));

    // Also run it regularly for a bit in case stuff changes while page is loading:
    const tagListWidthInterval = setInterval(this.setMainTagListWidth, 1000);
    setTimeout(() => {
      clearInterval(tagListWidthInterval);
    }, 15000);
  }

  ngOnDestroy() {
    for (let sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  initTags(): void {
    this.sortOpt = _.find(this.tagsService.sortOpts, { id: this.settings.get('tagSortBy') });

    // @TODO/tags We need to listen for tag updates and re-sort (otherwise things like adding library tag won't update sort)
    this.tags = _.filter(
      this.tagsService.sortTags(this.sortOpt),
      (tag) => ! tag.internal
    );

    this.subscriptions.push(this.router.events
      .filter((event) => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this))
    );
    // Above won't trigger with current router state, so let's do so manually:
    this.routeUpdated(this.router);
  }

  routeUpdated(event: NavigationEnd | Router) {
    // @HACK Should be able to subscribe to just param events via ActivatedRoute to get tag ID from `/tags/:tagId...` paths the params observer isn't firing - might be because of the EmptyComponents hack or maybe a bug that's fixed in later version, but anyway here we go:
    const pathParts = event.url.substring(1).split('/');

    if (pathParts[0] !== 'tags') {
      this.inSidebar = true;
      this.activeTag = null;
      this.activePane = null;
      this.activeTagPane = null;
      return;
    }

    this.inSidebar = false;

    // @HACK @TODO/tags @TODO/polish @TODO/soon This REALLY shouldn't be necessary, but for now, especially e.g. if you scroll to bottom of notes and then click on a tag, you could be stuck at the end of a tag details page. Different views should scroll independently. It also means you lose your place in your notes when you go back. Bah.
    if (! this.sizeMonitor.isMobile && (this.activeTag || this.activePane)) {
      // We were already looking at tags, so animate scroll so you don't lose your place
      this.scrollMonitor.scrollToTop();
    }
    else {
      // We were elsewhere, animating will look weird
      this.scrollMonitor.scrollToTop(0);
    }

    if (pathParts[1] === 'tag') {
      // We're browsing details of a specific tag
      this.activeTag = this.tagsService.tags[pathParts[2]];
      this.activePane = 'tagDetails';
      this.expandedTag = this.activeTag;

      // This whole activeTagPane thing is a hack (reading tagDetailsComponent.activePane directly from template was causing that debug mode error where expression changed while checking it)
      setTimeout(() => {
        if (this.tagDetailsComponent) {
          this.activeTagPane = this.tagDetailsComponent.activePane;
        }

        this.ensureTagVisibleInList(this.activeTag);
      }, 0);
    }
    else {
      // We're in a tag-related page other than details of a specific tag
      this.activeTag = null;
      this.activeTagPane = null;
      this.expandedTag = null;

      if (event.url.indexOf('/tags/smart-tags/library') === 0) {
        this.activePane = 'library';
      }
      else if (event.url.indexOf('/tags/explore') === 0) {
        this.activePane = 'viz';
      }
      else {
        if (! this.sizeMonitor.isMobile) {
          // On desktop we default to showing vizualization on main tag browser page
          this.activePane = 'viz';
        }
        else {
          // On mobile we default to just the tag browser tag list itself
          this.activePane = null;
        }
      }
    }
  }

  queryUpdated(): void {
    this.queryUpdated$.next(null);
  }

  queryFocus(): void {
    this.queryInput.nativeElement.focus();
  }
  queryClear(): void {
    this.query = '';
    this.queryUpdated();
  }

  sort(option?): void {
    if (option) {
      // ngSelect just gives us back object with id and text. We need to get full sortOpt:
      const sortOpt = _.find(this.tagsService.sortOpts, { id: option.id });
      this.settings.set('tagSortBy', sortOpt.id);
      this.sortOpt = sortOpt;
    }

    this.tags = _.filter(
      this.tagsService.sortTags(this.sortOpt),
      (tag) => ! tag.internal
    );
  }

  newTag(): void {
    this.addingNewTag = true;

    // Passing in false to not save to data store cause it has no name yet. If/when it gets named, then we'll save it.
    const newTag = this.tagsService.createTag({}, false);

    this.tags = _.concat([newTag], this.tags);

    // Have to wait cause angular hasn't updated the QueryList yet, but once it has, we can focus on the new tag component
    setTimeout(() => {
      this.tagComponents.first.renameStart();

      this.tagComponents.first.renamingOver.first().subscribe(() => {
        this.addingNewTag = false;
      });
    }, 0);
  }

  /** Called when one of the tags in this component is deleted. */
  tagDeleted(deletedTag: Tag): void {
    this.tags = _.filter(this.tags, (tag: Tag) => tag.id !== deletedTag.id);
  }

  tagClick(tag: Tag, event: MouseEvent): void {
    if (! tag.name) {
      // crappy shorthand for new tag
      return;
    }

    if (! this.inSidebar) {
      // In full-screen tag browser we just use the single tagHeaderClick for both tag and caret
      return;
    }

    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.tagToggled(tag.id, event && event.shiftKey);
      this.expandedTag = tag;
      // @TODO/polish @TODO/tag browser It should probably get closed again if the tag is removed from NoteQuery
    }
  }

  tagHeaderClick(tag: Tag): void {
    if (this.inSidebar) {
      // In the side bar we separate out clicks on tag vs caret
      return;
    }

    if (this.sizeMonitor.isMobile) {
      this.toggleTagDropdown(tag);
      return;
    }

    if (this.expandedTag !== tag) {
      tag.goTo();
      this.expandedTag = tag;
    }
    else {
      this.activeTag = null;
      this.router.navigateByUrl('/tags');
      this.expandedTag = null;
    }
  }

  tagDropdownCaretClick(tag: Tag): void {
    if (! this.inSidebar) {
      // In full-screen tag browser we just use the single tagHeaderClick for both tag and caret
      return;
    }

    this.toggleTagDropdown(tag);
  }

  toggleTagDropdown(tag: Tag) {
    if (this.expandedTag !== tag) {
      this.expandedTag = tag;
    }
    else {
      this.expandedTag = null;
    }
  }

  openToSearch(): void {
    if (this.activeUIs.home) {
      this.activeUIs.home.tagBrowserCollapsed = false;

      // Wait for this to take effect
      setTimeout(() => {
        this.queryInput.nativeElement.focus();
      }, 0);
    }
  }

  openToAddTag(): void {
    if (this.activeUIs.home) {
      this.activeUIs.home.tagBrowserCollapsed = false;

      // Wait for this to take effect
      setTimeout(() => {
        this.newTag();
      }, 0);
    }
  }

  /** On desktop the tag sidebar is `position: fixed`, which means the width is kind of messed up. This way we can inherit the exact width from the statically positioned parent. */
  setMainTagListWidth = () => {
    if (this.sizeMonitor.isMobile) {
      return;
    }

    const $tagList = $(this.mainTagListRef.nativeElement);
    const width = $tagList.parent().width();

    if (width <= 0) {
      // This only happens due to an alternate state, e.g. tag browser is collapsed, which shouldn't be taken into consideration because then we have a flash of 0 width tag list when the tag browser is un-collapsed
      return;
    }

    $tagList.css('width', width);
  }

  ensureTagVisibleInList(tag: Tag) {
    this.scrollMonitor.ensureElVisibleInScrollable(
      $(this.mainTagListRef.nativeElement).find('[data-tag-id=' + tag.id + ']')
    );
  }

  // // @TODO/polish Copied infinite scroll code from notes - we might want this eventually
  // infiniteScrollCheck(): void {
  //   if (! this.notes || this.limit >= this.notes.length) {
  //     return;
  //   }

  //   let lastNote = this.el.querySelector('note:last-child');
  //   if (! lastNote) {
  //     return;
  //   }

  //   let scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
  //   let viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
  //   let distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

  //   if (distanceTilLastNote < 500) {
  //     this.limit += 10;

  //     this._logger.log('Showing more notes: now showing', this.limit);
  //   }
  //   else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
  //     let tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
  //     if (! tenthFromlastNote) {
  //       return;
  //     }

  //     if (tenthFromlastNote.getBoundingClientRect().top - viewportBottomPos > 500) {
  //       this.limit -= 10;

  //       this._logger.log('Showing fewer nuts: now showing', this.limit);
  //     }
  //   }
  // }

}
