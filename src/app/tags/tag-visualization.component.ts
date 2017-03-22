import {Component, Inject, forwardRef, Input, SimpleChanges} from '@angular/core';

import {Note} from '../notes/';
import {Tag} from './';
import {TagsService} from './tags.service';

import {ForceGraph, GraphLink, GraphNode} from '../utils/force-graph.component';
import {Logger} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'tag-visualization',
  templateUrl: './tag-visualization.component.html'
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

  /** Maps parent tag ID to minimum number of notes required for a child tag to be shown on graph. */
  childTagCutoffs: { [parentTagId: string]: number } = {};

  private _logger: Logger = new Logger('TagVisualizationComponent');

  constructor(
    // private analyticsService: AnalyticsService,
    @Inject(forwardRef(() => TagsService)) private tagsService: TagsService
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
        this.tagGraph = null; // will destroy the component via ngIf
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

    this.childTagCutoffs = {};

    if (! this.centralTag) {
      links = this.computeLinks(this.tagsService.tags, this.tagsService.dataService.notes.notes);

      const nodeIndex: { [tagId: string]: GraphNode } = {};

      let node: GraphNode;
      _.each(this.tagsService.tags, (tag: Tag) => {
        node = this.tagToNode(tag, true);
        if (node) {
          nodeIndex[node.id] = node;
        }
      });

      // And now remove links to or from nodes that never made it in to `nodesToUse`
      links = links.filter((link) => {
        return nodeIndex[link.source] && nodeIndex[link.target];
      });

      nodes = _.values(nodeIndex);
    }
    else {
      links = this.computeLinks(this.tagsService.tags, this.centralTag.getChildInclusiveNotes());

      // This will hold only the nodes that have links to `centralTag`
      let nodesToUse: { [tagId: string]: GraphNode } = {};

      // We should make sure we always show child tags of `centralTag` even if they have no links (as long as they have enough notes not to be excluded by `excludeChildTag`)
      if (this.centralTag.childTagIds.length) {
        this.centralTag.childTagIds.forEach((childTagId) => {
          if (! this.excludeChildTag(this.tagsService.tags[childTagId])) {
            nodesToUse[childTagId] = this.tagToNode(this.tagsService.tags[childTagId]);
          }
        });
      }

      // Populate `nodesToUse` with only nodes that link to central tags
      let sourceTag: Tag;
      let targetTag: Tag;
      links.forEach((link) => {
        sourceTag = this.tagsService.tags[link.source];
        targetTag = this.tagsService.tags[link.target];
        if (
          [sourceTag, sourceTag.parentTag, targetTag, targetTag.parentTag]
            .indexOf(this.centralTag) === -1
        ) {
          return;
        }

        if (typeof nodesToUse[link.source] === 'undefined') {
          if (this.excludeChildTag(sourceTag)) {
            nodesToUse[link.source] = null;
          }
          else {
            nodesToUse[link.source] = this.tagToNode(sourceTag);
          }
        }
        if (typeof nodesToUse[link.target] === 'undefined') {
          if (this.excludeChildTag(targetTag)) {
            nodesToUse[link.target] = null;
          }
          else {
            nodesToUse[link.target] = this.tagToNode(targetTag);
          }
        }
      });

      // Now that `nodesToUse` has been pruned to just the relevant nodes, we can determine what cutoffs, if any, are needed for child tags. In the branch above where we do *not* have a central tag, `excludeChildTag` works based on all child tags, e.g. if there are 1,000 topic tags then we need to exclude some. However, in this case there might only be 3 topic tags that are connected to the central tag being shown, in which case we should exclude based on that.
      this.childTagCutoffs = {}; // Previously calculating by all tags, now we need to calculate from the tags we have so far
      nodesToUse = _.pickBy(nodesToUse, (node: GraphNode) => {
        if (! node) {
          return false;
        }
        else if (node.central) {
          return true;
        }
        return ! this.excludeChildTag(this.tagsService.tags[node.id], nodesToUse);
      }) as { [tagId: string]: GraphNode };

      // And now, finally, remove links to or from nodes that never made it in to `nodesToUse`
      links = links.filter((link) => {
        return nodesToUse[link.source] && nodesToUse[link.target];
      });

      nodes = _.values(nodesToUse);
    }

    this.tagGraph = {
      nodes: nodes,
      links: links,
    };

    this._logger.timeEnd('Computed tags nodes and links');
  }

  tagToNode(tag: Tag, childTagCutoff?): GraphNode {
    if (! tag) {
      return null;
    }

    if (tag.childTagIds.length && tag.docs.length === 0) {
      // Ignore parent tags that aren't used themselves
      return null;
    }

    if (childTagCutoff && this.excludeChildTag(tag)) {
      return null;
    }

    let classAttr;
    if (tag.prog) {
      classAttr = 'is--prog';
    }
    else if (tag.internal) {
      classAttr = 'is--internal';
    }
    else {
      classAttr = '';
    }

    return {
      id: tag.id,
      name: tag.name,
      size: tag.noteCount,
      classAttr: classAttr,
      tagInstance: tag,
      central: tag === this.centralTag || tag.parentTag === this.centralTag,
    };
  }

  /** Graph can get too crowded if a tag has many child tags, e.g. topic tag has 1,500 child tags on my 400 notes. So decide, based on noteCount and number of sibling child tags (either across all tags, or just the tags specified in `relativeTo`), whether we should show it. @TODO/polish @TODO/prog Would be cool to have a little indicator that some tags have been hidden. */
  excludeChildTag(tag: Tag, relativeTo?: { [tagId: string]: Tag | GraphNode }): boolean {
    if (! tag.parentTag) {
      return false;
    }

    if (! relativeTo) {
      relativeTo = this.tagsService.tags;
    }

    if (typeof this.childTagCutoffs[tag.parentTagId] === 'undefined') {
      this.childTagCutoffs[tag.parentTagId] = this.calculateChildTagCutoffs(tag.parentTag, relativeTo);
    }

    return tag.noteCount < this.childTagCutoffs[tag.parentTagId];
  }

  calculateChildTagCutoffs(parentTag: Tag, relativeTo: { [tagId: string]: Tag | GraphNode }) {
    let baseCutoff = 20;
    if (this.centralTag && this.centralTag !== parentTag) {
      baseCutoff = 10;
    }

    if (parentTag.childTagIds.length <= baseCutoff) {
      return 0;
    }

    let childTags: Tag[] = _.reduce(relativeTo, (tags: Tag[], tag: Tag | GraphNode): Tag[] => {
      if (! tag) {
        return tags;
      }

      if (! (tag instanceof Tag)) {
        tag = this.tagsService.tags[tag.id];
      }

      if (tag.parentTag === parentTag) {
        tags.push(tag);
      }

      return tags;
    }, []);

    let cutoff = 0;
    while (childTags.length > baseCutoff) {
      cutoff++;
      childTags = childTags.filter((tag) => tag.noteCount >= cutoff);
    }

    if (this.centralTag === parentTag && childTags.length < 5) {
      // We went too far!
      cutoff--;
    }

    return cutoff;
  }

  computeLinks(
    tags: { [tagId: string]: Tag },
    notes: { [noteId: string]: Note } | Note[],
  ): GraphLink[] {
    const tagLinkIndex = {}; // maps from string (source tag + sep + target tag) to weight
    const separator = '👻🌚🌀🌱'; // need something unlikely to be in a child tag name

    _.each(notes, (note) => {
      if (! note.tags || note.tags.length < 2) {
        return;
      }

      // Get actual Tag instances and filter out shared tags or broken stuff
      const validTagNodes: GraphNode[] = note.tags
        .map((tagId) => tags[tagId])
        .filter((tag) => tag);

      if (validTagNodes.length < 2) {
        return;
      }

      // We want to get every pairing of tags on this note, but since links are bidirectional we don't need the reverse, e.g. tag 4 -> tag 8 and tag 8 -> tag 4.
      for (let i = validTagNodes.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 0; j--) {
          const sourceTag = validTagNodes[i];
          const targetTag = validTagNodes[j];

          let sourceTagId = sourceTag.id;
          let targetTagId = targetTag.id;

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
