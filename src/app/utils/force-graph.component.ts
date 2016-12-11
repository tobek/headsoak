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

  // Derived values:
  radius?: number,
  textWidth?: number,
  centeredText?: boolean,
}
/** Each link maps from node ID to node ID (in reality they're bidirectional but this is how the data is stored) while weight is the number coocurrences on notes. **/
export interface GraphLink {
  source: string,
  target: string,
  weight: number,

  // Derived values:
  width: number,
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

  biggestNodeSize: number;
  heaviestLinkWeight: number;
  isCrowded: boolean;

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
    setTimeout(this.initGraph.bind(this), 0);
  }

  initGraph() {
    this._logger.time('Initialized D3 graph');

    const svgEl = this.svgRef.nativeElement;
    this.svg = d3.select(svgEl);

    const width = +window.getComputedStyle(svgEl).width.replace('px', '');
    const height = +window.getComputedStyle(svgEl).height.replace('px', '');

    const isCrowded = this.isCrowded = _.size(this.graph.nodes) > 50;
    const biggestNodeSize: number = this.biggestNodeSize = _.reduce(
      this.graph.nodes,
      (biggest: number, node: GraphNode) => {
        return Math.max(biggest, node.size);
      }, 0);
    const heaviestLinkWeight: number = this.heaviestLinkWeight = _.reduce(
      this.graph.links,
      (heaviest: number, link: GraphLink) => {
        return Math.max(heaviest, link.weight);
      }, 0);

    _.each(this.graph.nodes, this.initializeNode.bind(this));
    _.each(this.graph.links, this.initializeLink.bind(this));

    // var color = d3.scaleOrdinal(d3.schemeCategory20);

    this.simulation = d3.forceSimulation()
      .force('center', d3.forceCenter(width * 0.5, height * 0.4)) // 0.4 * height to shift center up a little bit to make room for description at bottom
      .force('charge', d3.forceManyBody()
        .strength(function(d) {
          // default is -30
          // return (d.size + 4) * -10;
          return (d.radius + 1) * -10;
        })
        .distanceMax(100)
      )
      .force('link', d3.forceLink()
        .id(function(d) { return d.id; })
        .strength(0.5)
        .distance(function(d) {
          // default is 30
          if (isCrowded) {
            return (d.source.radius + d.target.radius) * 1.5 + 25;
          }
          else {
            return (d.source.radius + d.target.radius) * 1.75 + 50;
          }
        })
      );

    this.simulation
      .nodes(this.graph.nodes);
    
    this.simulation
      .force('link')
      .links(this.graph.links);


    const links = this.svg.selectAll('.link')
        .data(this.graph.links)
      .enter().append('line')
        .attr('class', 'link')
        .attr('stroke-width', function(d) {
          return d.width;
        });

    const nodes = this.svg.selectAll('.node')
        .data(this.graph.nodes)
      .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted.bind(this))
          .on('drag', dragged.bind(this))
          .on('end', dragended.bind(this)));

    nodes.append('circle')
      .attr('r', function(d) {
        // Radius of node is number of notes this tag has, minimum size 3. sqrt to slow it down a bit (otherwise tag with 150 notes is giiigantic)
        return d.radius;
      })
      // .attr('fill', function(d) {
      //   // Right now our only coloring criteria is if it's programmatic or not
      //   return color(!! d.prog);
      // });
      // Let's color with CSS:
      .attr('class', function(d) {
        return d.classAttr || '';
      });

    const labels = nodes.append('text')
      // @TODO/visualization The text placement is off, should take name length into account otherwise it doesn't always fit in center. 
      .attr('text-anchor', function(d) {
        return d.centeredText ? 'middle' : null
      })
      .attr('dx', function(d) {
        return d.centeredText ? 0 : (3 + d.radius);
      })
      .attr('dy', '.35em')
      .text(function(d) { return d.name });

    this.simulation.on('tick', ticked);

    if (isCrowded) {
      // Fade (until hover) certain tags to make it less crowded
      // (Used to not fade ones with no pairs, cause those float to the outside so plenty of room for text. But that's a bit confusing looking.)
      labels.attr('class', (d) => {
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
      // Set the xy coordinates of the source and target ends of the links (constrained to fit within svg)
      links
        .attr('x1', function(d) { return constrainPos(d.source.x, width, d.source); })
        .attr('y1', function(d) { return constrainPos(d.source.y, height, d.source); })
        .attr('x2', function(d) { return constrainPos(d.target.x, width, d.target); })
        .attr('y2', function(d) { return constrainPos(d.target.y, height, d.target); });

      // Set the xy coordinates of the nodes (constrained to fit within svg)
      nodes.attr('transform', function(d) {
        // return 'translate(' + d.x + ',' + d.y + ')';
        return 'translate(' + constrainPos(d.x, width, d) + ',' + constrainPos(d.y, height, d) + ')';
      });
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

    function constrainPos(pos, constraint, node: GraphNode) {
      return Math.max(node.radius, Math.min(constraint - node.radius, pos));
    }

    this._logger.timeEnd('Initialized D3 graph');
  }

  /** Somewhat normalizes radius based on # of notes a tag is on. Could need tweaking but should do for a while! */
  nodeRadius(node: GraphNode) {
    if (this.biggestNodeSize > 50) {
      // From 3px up to 30px for a tag with 100 notes, up to ~100px for a tag with 1000 notes
      return Math.sqrt(node.size) * 3 || 3;
    }
    else {
      // 1.5th root - steeper at first so larger radii for tags with fewer notes, but still levels off
      return Math.pow(node.size, 1/1.5) * 4 || 4;
    }
  }

  initializeNode(node: GraphNode) {
    node.radius = this.nodeRadius(node);

    // In current font size we average 5.2px/char. Calculated using the following in console on tag browser page:
    //   _.mean(_.map(document.querySelectorAll('svg text'), function(node) { return (parseInt(window.getComputedStyle(node).width)/node.innerHTML.length) }))
    node.textWidth = node.name.length * 5.2;

    // node.centeredText = node.radius > 20;
    node.centeredText = node.radius * 2 - node.textWidth > 6;
  }

  initializeLink(link: GraphLink) {
    // We do want to slow down massive increases using sqrt, but we also don't want 2 cooccurrences to be indistinguishable from 1, so multiply it. But we want to start at 1px, so subtract down to that for weight 1:
    if (this.heaviestLinkWeight > 10) {
      link.width = Math.sqrt(link.weight) * 2 - 1;
    }
    else {
      link.width = Math.sqrt(link.weight) * 3 - 2;
    }
  }
}
