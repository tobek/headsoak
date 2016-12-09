import {Component} from '@angular/core';

import {Note} from '../notes/';
import {Tag} from './';
import {TagComponent} from './tag.component';
import {TagsService} from './tags.service';

import {ForceGraphComponent, ForceGraph, GraphLink, GraphNode} from '../utils/force-graph.component';
import {Logger} from '../utils/';

const d3 = require('d3');

@Component({
  selector: 'tag-visualization',
  pipes: [],
  directives: [
    ForceGraphComponent,
    TagComponent
  ],
  template: require('./tag-visualization.component.html')
})
export class TagVisualizationComponent {
  tagGraph: ForceGraph;

  /** Maps from tag ID to # of cooccurrences. @NOTE Currently only used if `this.isCrowded`. @NOTE Now not used at all, and `isCrowded` is calculated in ForceGraphComponent */
  // pairCount: { [key: string]: number } = {};

  isCrowded = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    // private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {
  }

  ngOnInit() {
    this.tagGraph = {
      nodes: this.computeNodes(this.tagsService.tags),
      links: this.computeLinks(this.tagsService.tags, this.tagsService.dataService.notes.notes),
    };
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
  }

  computeNodes(tags: { [key: string]: Tag }): GraphNode[] {
    // We use _.flatten because while mapping we sometimes return an array of subtags
    return _.flatten(_.map(tags, (tag: Tag) => {
      if (_.size(tag.subTagDocs)) {
        // Return an array of subtags (molded to fit GraphNode type)
        return _.map(tag.subTagDocs, (docs, subTagName): GraphNode => {
          return {
            id: tag.id + ':' + subTagName,
            name: tag.name + ': ' + subTagName,
            size: docs.length,
            classAttr: tag.prog ? 'is--prog': '',
          };
        });
      }
      else {
        // Just return the tag (molded to fit GraphNode type)
        return {
          id: tag.id,
          name: tag.name,
          size: tag.docs.length,
          classAttr: tag.prog ? 'is--prog': '',
        };
      }
    }));
  }

  computeLinks(tags: { [key: string]: Tag }, notes: { [key: string]: Note }): GraphLink[] {
    this._logger.time('Computed all tag links');

    const tagLinkIndex = {};
    const separator = '👻🌚🌀🌱'; // need something unlikely to be in a subtag name

    _.each(notes, (note) => {
      if (! note.tags || note.tags.length < 2) {
        return;
      }

      // Get actual Tag instances and filter out shared tags or broken stuff
      const validTags = note.tags
        .map(tagId => tags[tagId])
        .filter(tag => tag);

      if (validTags.length < 2) {
        return;
      }

      // We want to get every pairing of tags on this note, but since links are bidirectional we don't need the reverse, e.g. tag 4 -> tag 8 and tag 8 -> tag 4.
      for (let i = validTags.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 0; j--) {
          const sourceTag = validTags[i];
          const targetTag = validTags[j];

          let sourceTagId = sourceTag.id;
          let targetTagId = targetTag.id;

          if (_.size(sourceTag.subTagDocs)) {
            _.each(sourceTag.subTagDocs, (docs, sourceTagName) => {
              if (docs.indexOf(note.id) !== -1) {
                sourceTagId += ':' + sourceTagName;
                return false;
              }
            });
          }
          if (_.size(targetTag.subTagDocs)) {
            _.each(targetTag.subTagDocs, (docs, targetTagName) => {
              if (docs.indexOf(note.id) !== -1) {
                targetTagId += ':' + targetTagName;
                return false;
              }
            });
          }

          const tagLink = sourceTagId + separator + targetTagId;

          if (! tagLinkIndex[tagLink]) {
            tagLinkIndex[tagLink] = 1;
          }
          else {
            tagLinkIndex[tagLink]++;
          }

          // Currently we only used this if crowded, so waste to compute otherwise
          // (now not used at all, and `isCrowded` is calculated in ForceGraphComponent)
          // if (this.isCrowded) {
          //   if (! this.pairCount[validTags[i].id]) {
          //     this.pairCount[validTags[i].id] = 1;
          //   }
          //   else {
          //     this.pairCount[validTags[i].id]++;
          //   }
          //   if (! this.pairCount[validTags[j].id]) {
          //     this.pairCount[validTags[j].id] = 1;
          //   }
          //   else {
          //     this.pairCount[validTags[j].id]++;
          //   }
          // }
        }
      }
    });

    const tagLinks = _.map(tagLinkIndex, (weight, link): GraphLink => {
      const links = link.split(separator);
      return {
        source: links[0],
        target: links[1],
        weight: <number> weight
      };
    });

    this._logger.timeEnd('Computed all tag links');
    return tagLinks;
  }
}
