import {Pipe, PipeTransform} from '@angular/core';

import {Logger} from '../utils/';

import {Note} from '../notes/';
import {Tag} from '../tags/';
import {TagsService} from '../tags/tags.service';

import * as _ from 'lodash';

const erroredOnMissingTag: { [noteAndTagIds: string ]: boolean} = {};

@Pipe({ name: 'mapIdsToTags' })
export class MapIdsToTagsPipe implements PipeTransform {
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private tagsService: TagsService
  ) {}

  // @TODO/optimization This seems to be getting called a BILLION times (more in dev mode but still in prod) though only seeing it when we hit that error with missing tag of course. Seems to be because of change detection starting from app component. Is that necessary?
  transform(arr: string[], note?: Note): Tag[] {
    if (! _.size(arr)) {
      return [];
    }

    return _.reduce(arr, (tags: Tag[], tagId: string): Tag[] => {
      const tag = note ? note.dataService.tags.tags[tagId] : this.tagsService.tags[tagId];

      if (tag) {
        tags.push(tag);
      }
      else {
        // Have had some issue with deleted or non-existent tag IDs showing up on notes, here we can debug it

        if (note && ! erroredOnMissingTag[note.id + tagId]) {
          // Logging this message a gajillion times slows things down and also we report this to GA, so only do it once
          this._logger.warn('Note ID', note.id, 'claims to have tag ID', tagId, 'but no tag found for that ID.');
          erroredOnMissingTag[note.id + tagId] = true;
        }
        // @TODO/rewrite @TODO/tags. Check firebase data for all of these and see how pervasive. Permanent fix would be to loop through notes that reference this tag! Once fixed, TagComponent should throw an error rather than try to handle being passed no tag
      }

      return tags;
    }, []);
  }
}
