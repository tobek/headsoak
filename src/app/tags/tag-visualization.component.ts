import {Component, Input, SimpleChanges} from '@angular/core';

import {Note} from '../notes/';
import {Tag} from './';
import {TagsService} from './tags.service';

import {ForceGraph, GraphLink, GraphNode} from '../utils/force-graph.component';
import {Logger} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'tag-visualization',
  template: require('./tag-visualization.component.html')
})
export class TagVisualizationComponent {
  /** If not input, visualize all tags. If input, only show those connected to this tag. */
  @Input() centralTag?: Tag;

  /** If input, visualization should highlight this tag. */
  @Input() highlightedTag?: Tag;

  tagGraph: ForceGraph;

  /** Maps from tag ID to # of cooccurrences. @NOTE Currently only used if `this.isCrowded`. @NOTE Now not used at all, and `isCrowded` is calculated in ForceGraphComponent */
  // pairCount: { [tagId: string]: number } = {};

  isCrowded = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    // private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['centralTag']) {
      // this.centralTag is now a new value

      if (_.isEmpty(changes['centralTag'].previousValue)) {
        // There was no previous value so we can just go for it
        this.setUpGraph();
      }
      else {
        // Kind of a hack but not sure how to reset the d3 viz so let's just destroy and recreate whole component
        this.tagGraph = null // will destroy the component via ngIf
        this.highlightedTag = null; // because the currently highlighted tag might not be present in the new viz
        setTimeout(this.setUpGraph.bind(this), 0);
      }
    }
  }

  ngOnInit() {
    if (! this.tagGraph) {
      this.setUpGraph();
    }
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
  }

  setUpGraph() {
    this._logger.time('Computed tags nodes and links');

    let links: GraphLink[];
    let nodes: GraphNode[];

    // Index of processed Tags which we can prune if we're using centralTag.
    const nodeIndex: { [tagId: string]: GraphNode } = this.computeNodes(this.tagsService.tags);

    if (! this.centralTag) {
      nodes = _.map(nodeIndex, (node) => node); // just turn into an array
      links = this.computeLinks(this.tagsService.tags, this.tagsService.dataService.notes.notes);
    }
    else {
      const nodeIndexPruned: { [tagId: string]: GraphNode } = {};

      links = this.computeLinks(
        this.tagsService.tags,
        this.centralTag.getNotes(),
        nodeIndex,
        nodeIndexPruned
      );

      nodes = _.map(nodeIndexPruned, (node) => node);
    }

    this.tagGraph = {
      nodes: nodes,
      links: links,
    };

    this._logger.timeEnd('Computed tags nodes and links');
  }

  computeNodes(tags: { [tagId: string]: Tag }): { [tagId: string]: GraphNode } {
    const nodeIndex: { [tagId: string]: GraphNode } = {};

    let classAttr;
    _(tags).each((tag: Tag) => {
      if (tag.prog) {
        classAttr = 'is--prog';
      }
      else if (tag.internal) {
        classAttr = 'is--internal';
      }
      else {
        classAttr = '';
      }

      if (_.size(tag.childTagDocs)) {
        // Go through each child tag
        _.each(tag.childTagDocs, (docs, childTagName) => {
          nodeIndex[tag.getChildTagId(childTagName)] = {
            id: tag.getChildTagId(childTagName),
            name: tag.name + ': ' + childTagName,
            size: docs.length,
            classAttr: classAttr,
            tagInstance: tag,
            central: tag === this.centralTag,
          };
        });
      }
      else {
        nodeIndex[tag.id] = {
          id: tag.id,
          name: tag.name,
          size: tag.docs.length,
          classAttr: classAttr,
          tagInstance: tag,
          central: tag === this.centralTag,
        };
      }
    });

    return nodeIndex;
  }

  /** If nodeIndexAll and nodeIndexToUse are supplied, nodeIndexToUse is populated with those nodes from nodeIndexAll that are found in links. nodeIndexToUse is modified as a side effect. */
  computeLinks(
    tags: { [tagId: string]: Tag },
    notes: { [noteId: string]: Note } | Note[],
    nodeIndexAll?: { [tagId: string]: GraphNode },
    nodeIndexToUse?: { [tagId: string]: GraphNode }
  ): GraphLink[] {
    const tagLinkIndex = {}; // maps from string (source tag + sep + target tag) to weight
    const separator = '👻🌚🌀🌱'; // need something unlikely to be in a child tag name

    _.each(notes, (note) => {
      if (! note.tags || note.tags.length < 2) {
        return;
      }

      // Get actual Tag instances and filter out shared tags or broken stuff
      const validTags: Tag[] = note.tags
        .map(tagId => tags[tagId])
        .filter(tag => tag);

      if (validTags.length < 2) {
        return;
      }

      // @TODO/now We should just make ChildTag instances here for each separate child tag and then loop through all of those - then we don't have to do getChildTagIdForNoteId

      // We want to get every pairing of tags on this note, but since links are bidirectional we don't need the reverse, e.g. tag 4 -> tag 8 and tag 8 -> tag 4.
      for (let i = validTags.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 0; j--) {
          const sourceTag = validTags[i];
          const targetTag = validTags[j];

          let sourceTagId = sourceTag.id;
          let targetTagId = targetTag.id;

          // Modify source/target tag "id"s if this note actually has a ChildTag
          let sourceChildTagId = sourceTag.getChildTagIdForNoteId(note.id);
          if (sourceChildTagId) {
            sourceTagId = sourceChildTagId;
          }
          let targetChildTagId = targetTag.getChildTagIdForNoteId(note.id);
          if (targetChildTagId) {
            targetTagId = targetChildTagId;
          }

          if (nodeIndexAll && nodeIndexToUse) {
            if (! nodeIndexToUse[sourceTagId]) {
              nodeIndexToUse[sourceTagId] = nodeIndexAll[sourceTagId];
            }
            if (! nodeIndexToUse[targetTagId]) {
              nodeIndexToUse[targetTagId] = nodeIndexAll[targetTagId];
            }
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

    return tagLinks;
  }
}
