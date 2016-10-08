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
  weight: number
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

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
    this.initGraph({
      nodes: _.values(this.tagsService.tags),
      links: this.computeLinks(),
    });
    // this.initGraph(graph3);
  }

  computeLinks(): TagLink[] {
    _.each(this.tagsService.tags, (tag) => {
      tag['group'] = 1;
    });

    const tagLinkIndex = {};
    let tagLink;

    _.each(this.tagsService.dataService.notes.notes, (note) => {
      if (! note.tags || note.tags.length < 2) {
        return;
      }

      // Filter out shared tags or broken stuff
      const validTags = note.tags.filter(tagId => this.tagsService.tags[tagId]);

      if (validTags.length < 2) {
        return;
      }

      // We want to get every pairing of tags on this note, but since links are bidirectional we don't need the reverse, e.g. tag 4 -> tag 8 and tag 8 -> tag 4.
      for (let i = validTags.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 0; j--) {
          tagLink = validTags[i] + ',' + validTags[j];
          if (! tagLinkIndex[tagLink]) {
            tagLinkIndex[tagLink] = 1;
          }
          else {
            tagLinkIndex[tagLink]++;
          }
        }
      }
    });

    this.tagLinks = _.map(tagLinkIndex, (weight, link): TagLink => {
      const links = link.split(',');
      return {
        source: links[0],
        target: links[1],
        weight: <number> weight
      };
    });

    return this.tagLinks;
  }

  initGraph(graph) {
    const svgEl = document.querySelector('#tag-graph');
    const svg = d3.select(svgEl),
        width = +getComputedStyle(svgEl).width.replace('px', ''),
        height = +getComputedStyle(svgEl).height.replace('px', '');

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var simulation = d3.forceSimulation()
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody())
      // .force('link', d3.forceLink());
      .force('link', d3.forceLink().id(function(d) { return d.id; }));

    simulation
      .nodes(graph.nodes);
    
    simulation
      .force('link')
      .links(graph.links);


    var link = svg.selectAll('.link')
        .data(graph.links)
      .enter().append('line')
        .attr('class', 'link')
        .attr('stroke-width', function(d) {
          // return Math.sqrt(d.weight);
          // # co-occurrences isn't that crazy so don't need to sqrt it
          return d.weight;
        });

    var node = svg.selectAll('.node')
        .data(graph.nodes)
      .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    node.append('circle')
        .attr('r', function(d) {
          // Radius of node is number of notes this tag has, minimum size 3. sqrt to slow it down a bit (otherwise tag with 150 notes is giiigantic)
          return calcRadius(d);
        })
        .attr('fill', function(d) {
          // Right now our only coloring criteria is if it's programmatic or not
          return color(!! d.prog);
        });

    node.append('text')
        .attr('dx', 12)
        .attr('dy', '.35em')
        .text(function(d) { return d.name });

    simulation.on('tick', ticked);

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

      // label
      //   .attr('x', function(d) { return d.x + 8; })
      //   .attr('y', function(d) { return d.y; });
    }

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    function bindPos(pos, bound, d) {
      const radius = calcRadius(d);
      return Math.max(radius, Math.min(bound - radius, pos));
    }

    function calcRadius(d) {
      return Math.sqrt(d.docs.length) * 3 || 3;
    }
  }
}
