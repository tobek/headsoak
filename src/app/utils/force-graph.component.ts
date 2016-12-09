import {Component, Input, ViewChild, ElementRef} from '@angular/core';

import {Logger} from './';

const d3 = require('d3');

export interface ForceGraph {
  nodes: GraphNode[],
  links: GraphLink[],
}
export interface GraphNode {
  id: string,
  name: string,
  size: number,
  classAttr?: string,
}
/** Each link maps from node ID to node ID (in reality they're bidirectional but this is how the data is stored) while weight is the number coocurrences on notes. **/
export interface GraphLink {
  source: string,
  target: string,
  weight: number,
}

@Component({
  selector: 'force-graph',
  pipes: [],
  directives: [],
  template: require('./force-graph.component.html')
})
export class ForceGraphComponent {
  @Input() graph: ForceGraph;

  @ViewChild('svg') svgRef: ElementRef;

  /** D3 selection of svg element we use for visualization. */
  svg;
  /** D3 force simulation. */
  simulation;

  isCrowded = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
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
    this.initGraph();
  }

  initGraph() {
    this._logger.time('Initialized D3 graph');

    const svgEl = this.svgRef.nativeElement;
    this.svg = d3.select(svgEl);

    const width = +window.getComputedStyle(svgEl).width.replace('px', '');
    const height = +window.getComputedStyle(svgEl).height.replace('px', '');

    this.isCrowded = _.size(this.graph.nodes) > 100;

    // var color = d3.scaleOrdinal(d3.schemeCategory20);

    this.simulation = d3.forceSimulation()
      .force('center', d3.forceCenter(width * 0.5, height * 0.4)) // 0.4 * height to shift center up a little bit to make room for description at bottom
      .force('charge', d3.forceManyBody()
        .strength(function(d) {
          // default is -30
          // return (d.size + 4) * -10;
          return (calcRadius(d) + 1) * -10;
        })
        .distanceMax(100)
      )
      .force('link', d3.forceLink()
        .id(function(d) { return d.id; })
        .strength(0.5)
        .distance(function(d) {
          // default is 30
          return (calcRadius(d.source) + calcRadius(d.target))*1.5 + 25;
        })
      );

    this.simulation
      .nodes(this.graph.nodes);
    
    this.simulation
      .force('link')
      .links(this.graph.links);


    var link = this.svg.selectAll('.link')
        .data(this.graph.links)
      .enter().append('line')
        .attr('class', 'link')
        .attr('stroke-width', function(d) {
          // We do want to slow down massive increases using sqrt, but we also don't want 2 cooccurrences to be indistinguishable from 1, so double it. But we want to start at 1px, so subtract 1:
          return Math.sqrt(d.weight) * 2 - 1;
        });

    var node = this.svg.selectAll('.node')
        .data(this.graph.nodes)
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
        return d.classAttr || '';
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
        // if (d.size <= 1 && this.pairCount[d.id]) {
        if (d.size <= 1) {
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
      return Math.sqrt(d.size) * 3 || 3;
    }

    this._logger.timeEnd('Initialized D3 graph');
  }
}
