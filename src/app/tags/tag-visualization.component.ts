import {Component} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagComponent} from './tag.component';
import {TagsService} from './tags.service';

import {Logger} from '../utils/';

const d3 = require('d3');

/** Each link maps from tagId to tagId (in reality they're bidirectional but this is how the data is stored) while weight is the number coocurrences on notes. **/
type TagLink = {
  source: string,
  target: string,
  weight: number,
};
type TagNode = {
  id: string,
  name: string,
  docs: string[],
  prog?: boolean,
};

@Component({
  selector: 'tag-visualization',
  pipes: [],
  directives: [
    TagComponent
  ],
  template: require('./tag-visualization.component.html')
})
export class TagVisualizationComponent {
  tagLinks: TagLink[];

  /** D3 selection of svg element we use for visualization. */
  svg;
  /** D3 force simulation. */
  simulation;

  /** Maps from tag ID to # of cooccurrences. @NOTE Currently only used if `this.isCrowded`. @NOTE Now not used at all */
  // pairCount: { [key: string]: number } = {};

  isCrowded = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.svg.selectAll('*').remove();
    this.simulation.stop();
    delete this.svg;
    delete this.simulation;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initGraph({
        // nodes: _.values(this.tagsService.tags),
        nodes: this.computeNodes(),
        links: this.computeLinks(),
      });
      // this.initGraph(graph3);
    }, 0);
  }

  computeNodes(): TagNode[] {
    // We use _.flatten because while mapping we sometimes return an array of subtags
    return _.flatten(_.map(this.tagsService.tags, (tag: Tag) => {
      if (_.size(tag.subTagDocs)) {
        // Return an array of subtags (molded to fit TagNode type)
        return _.map(tag.subTagDocs, (docs, subTagName): TagNode => {
          return {
            id: tag.id + ':' + subTagName,
            name: tag.name + ': ' + subTagName,
            docs: docs,
            prog: tag.prog,
          };
        });
      }
      else {
        // Just return the tag!
        return tag;
      }
    }));
  }

  computeLinks(): TagLink[] {
    this._logger.time('Computed all tag links');

    this.isCrowded = _.size(this.tagsService.tags) > 100;

    const tagLinkIndex = {};
    const separator = '👻🌚🌀🌱'; // need something unlikely to be in a subtag name

    _.each(this.tagsService.dataService.notes.notes, (note) => {
      if (! note.tags || note.tags.length < 2) {
        return;
      }

      // Get actual Tag instances and filter out shared tags or broken stuff
      const validTags = note.tags
        .map(tagId => this.tagsService.tags[tagId])
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
          // (now not used at all)
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

    this.tagLinks = _.map(tagLinkIndex, (weight, link): TagLink => {
      const links = link.split(separator);
      return {
        source: links[0],
        target: links[1],
        weight: <number> weight
      };
    });

    this._logger.timeEnd('Computed all tag links');
    return this.tagLinks;
  }

  initGraph(graph) {
    this._logger.time('Initialized D3 graph');

    const svgEl = document.querySelector('#tag-graph');
    this.svg = d3.select(svgEl);

    const width = +getComputedStyle(svgEl).width.replace('px', '');
    const height = +getComputedStyle(svgEl).height.replace('px', '');

    // var color = d3.scaleOrdinal(d3.schemeCategory20);

    this.simulation = d3.forceSimulation()
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody()
        .strength(function(d) {
          // default is -30
          // return (d.docs.length + 4) * -10;
          return (calcRadius(d) + 1) * -10;
        })
        .distanceMax(100)
      )
      // .force('link', d3.forceLink());
      .force('link', d3.forceLink()
        .id(function(d) { return d.id; })
        .strength(0.5)
        .distance(function(d) {
          // default is 30
          return (calcRadius(d.source) + calcRadius(d.target))*1.5 + 25;
        })
      );

    this.simulation
      .nodes(graph.nodes);
    
    this.simulation
      .force('link')
      .links(graph.links);


    var link = this.svg.selectAll('.link')
        .data(graph.links)
      .enter().append('line')
        .attr('class', 'link')
        .attr('stroke-width', function(d) {
          // return Math.sqrt(d.weight);
          // # co-occurrences isn't that crazy so don't need to sqrt it
          return d.weight;
        });

    var node = this.svg.selectAll('.node')
        .data(graph.nodes)
      .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted.bind(this))
          .on('drag', dragged.bind(this))
          .on('end', dragended.bind(this)));

    node.append('circle')
      .attr('r', function(d) {
        // Radius of node is number of notes this tag has, minimum size 3. sqrt to slow it down a bit (otherwise tag with 150 notes is giiigantic)
        return calcRadius(d);
      })
      // .attr('fill', function(d) {
      //   // Right now our only coloring criteria is if it's programmatic or not
      //   return color(!! d.prog);
      // });
      // Let's color with CSS:
      .attr('class', function(d) {
        return d.prog ? 'is--prog' : '';
      });

    var text = node.append('text')
      // @TODO/optimization Shouldn't have to keep calling calcRadius
      // @TODO/visualization The text placement is off, should take name length into account otherwise it doesn't always fit in center. 
      .attr('text-anchor', function(d) {
        return calcRadius(d) > 20 ? 'middle' : null
      })
      .attr('dx', function(d) {
        const radius = calcRadius(d);
        return radius > 20 ? 0 : (3 + radius);
      })
      .attr('dy', '.35em')
      .text(function(d) { return d.name });

    this.simulation.on('tick', ticked);

    if (this.isCrowded) {
      // Fade (until hover) certain tags to make it less crowded
      // (Used to not fade ones with no pairs, cause those float to the outside so plenty of room for text. But that's a bit confusing looking.)
      text.attr('class', (d) => {
        // if (d.docs.length <= 1 && this.pairCount[d.id]) {
        if (d.docs.length <= 1) {
          return 'is--faded';
        }
        else {
          return '';
        }
      })
    }

    function ticked() {
      link
        // .attr('x1', function(d) { return d.source.x; })
        // .attr('y1', function(d) { return d.source.y; })
        // .attr('x2', function(d) { return d.target.x; })
        // .attr('y2', function(d) { return d.target.y; });
        .attr('x1', function(d) { return bindPos(d.source.x, width, d.source); })
        .attr('y1', function(d) { return bindPos(d.source.y, height, d.source); })
        .attr('x2', function(d) { return bindPos(d.target.x, width, d.target); })
        .attr('y2', function(d) { return bindPos(d.target.y, height, d.target); });

      node.attr('transform', function(d) {
        // return 'translate(' + d.x + ',' + d.y + ')';
        return 'translate(' + bindPos(d.x, width, d) + ',' + bindPos(d.y, height, d) + ')';
      });
      // node
      //   .attr('cx', function(d) { return d.x; })
      //   .attr('cy', function(d) { return d.y; });
    }

    function dragstarted (d) {
      if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged (d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended (d) {
      if (!d3.event.active) this.simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    function bindPos(pos, bound, d) {
      const radius = calcRadius(d);
      return Math.max(radius, Math.min(bound - radius, pos));
    }

    /** Somewhat normalizes radius based on # of notes a tag is on. This goes from 3px up to 30px for a tag with 100 notes, up to ~100 for a tag with 1000 notes. Could need tweaking but should do for a while! */
    function calcRadius(d) {
      return Math.sqrt(d.docs.length) * 3 || 3;
    }

    this._logger.timeEnd('Initialized D3 graph');
  }
}
