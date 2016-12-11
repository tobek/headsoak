import {Component, Input, ViewChild, ElementRef, HostBinding} from '@angular/core';

import {Logger} from './';

const d3 = require('d3');
const bboxCollide = require('d3-bboxCollide').bboxCollide;

/** For non-centered labels, distance between edge of node and its label. */
const NODE_LABEL_SPACING = 3;

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
  @HostBinding('class.is--crowded') isCrowded: boolean;

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
    // this.graph.links = []

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

    const linkCounts = {}; // maps from node id to # of links it's part of
    const heaviestLinkWeight: number = this.heaviestLinkWeight = _.reduce(
      this.graph.links,
      (heaviest: number, link: GraphLink) => {
        // While we're at it, build up index that tells us how many connections each node has
        linkCounts[link.source] = (linkCounts[link.source] || 0) + 1;
        linkCounts[link.target] = (linkCounts[link.target] || 0) + 1;
        return Math.max(heaviest, link.weight);
      }, 0);

    _.each(this.graph.nodes, this.initializeNode.bind(this));
    _.each(this.graph.links, this.initializeLink.bind(this));

    // var color = d3.scaleOrdinal(d3.schemeCategory20);

    this.simulation = d3.forceSimulation()
      .force('center', d3.forceCenter(width * 0.5, height * 0.4)) // 0.4 * height to shift center up a little bit to make room for description at bottom
      .force('bound', (function() {
        // Here we make a custom force

        let _nodes;

        const force = function force(alpha) {
          // This gets run on every tick
          for (let i = 0, n = _nodes.length, node; i < n; ++i) {
            node = _nodes[i];

            const constrainedX = constrainCoord(node, 'x');
            const constrainedY = constrainCoord(node, 'y');

            node.vx += (constrainedX - node.x) * alpha;
            node.vy += (constrainedY - node.y) * alpha;
          }
        }

        // Our custom force gets passed the simulation's nodes to an optional `initialize` attribute
        force['initialize'] = function(nodes) {
          _nodes = nodes;
        }

        return force;
      })())
      .force('charge', d3.forceManyBody()
        .strength(function(d) {
          // default is -30
          return (d.radius + 1) * -5;
        })
        .distanceMin(function(d) {
          // Can let collision take care of really close forces
          return d.radius;
        })
        .distanceMax(function(d) {
          return d.radius * 2;
        })
      )
      .force('link', d3.forceLink()
        .id(function(d) { return d.id; })
        // .strength(0.1)
        .strength(function(link: GraphLink) {
          // Average # of links the source and target nodes have
          const avgConnections = (linkCounts[link.source['id']] + linkCounts[link.target['id']]) / 2;

          if (avgConnections <= 4) {
            // Small cluster, these can stay close - stronger link even closer, from 0 to 0.5
            return Math.min(Math.sqrt(link.weight), 5) * 0.1;
          }
          else if (link.weight > 3) {
            // Strong link in a big cluster - keep these closeish
            return 0.1;
          }
          else {
            // Weak link in a big cluster - let these go wherever
            return 0.001;
          }

          // from 0.05 - 0.5, heavier links are stronger
          // return Math.min(link.weight, 10) * 0.05;

          // The higher the total number of links between the source and target combined, the lower the strength, so that densely packed nodes have more space to move around.
          // return 1 / Math.sqrt(linkCounts[link.source['id']] + linkCounts[link.target['id']]);
        })
        .distance(function(link: GraphLink) {
          // default is 30

          // if (isCrowded) {
          //   return (d.source.radius + d.target.radius) * 1.5 + 25;
          // }
          // else {
          //   return (d.source.radius + d.target.radius) * 1.75 + 50;
          // }

          // The more connections the most-connected node of this link has, the further the natural distance
          return 20 + 5 * Math.sqrt(Math.max(linkCounts[link.source['id']] + linkCounts[link.target['id']]));
        })
      )
      .force('collide', bboxCollide(function(node: GraphNode) {
        // Return an array of top-left and bottom-right coordinates for collision bounding box. Since these are based off of the center of the node, the top and left coordinates should be negative.
        let x1, y1, x2, y2;

        if (node.centeredText) {
          x1 = y1 = node.radius * -1 - 2;
          x2 = y2 = node.radius + 2;
        }
        else {
          x1 = node.radius * -1 - NODE_LABEL_SPACING - 4; // not sure why extra -4 is needed but seems to be
          x2 = node.radius + NODE_LABEL_SPACING + node.textWidth;

          // All labels are one vertically-centered line of 15px high
          y1 = -10;
          y2 = 10;
        }

        return [[x1, y1], [x2, y2]];
      }));

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
      .attr('dx', (d) => {
        return d.centeredText ? 0 : (NODE_LABEL_SPACING + d.radius);
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
      // @NOTE Normally here you would just take the x/y coords tracked internally by D3 and set the appropriate svg attributes to actually arrange the graph. Here we instead constrain D3's values to fit within width/height of svg. *We are actually already constraining to this bound with the `bound` force* - however, both sets of constraints are needed. If we only use the force, then nodes momentarily get pushed off the edge, and sometimes stay there if there are strong enough competing forces. If we only use the constraint here when translating into svg attributes, then we appear to get a hard bound that nodes never cross, but since D3's internal tracking of coordinates is unaffected, some nodes that *seem* to be at the edge are actually outside according to D3 are outside. These nodes then act in unexpected ways: they do not collide with other nodes that appear to overlap, dragging behavior is weird, etc. So we use both sets of constraints.

      // Set the xy coordinates of the source and target ends of the links (constrained to fit within svg)
      links
        .attr('x1', function(d) { return constrainCoord(d.source, 'x'); })
        .attr('y1', function(d) { return constrainCoord(d.source, 'y'); })
        .attr('x2', function(d) { return constrainCoord(d.target, 'x'); })
        .attr('y2', function(d) { return constrainCoord(d.target, 'y'); });

      // Set the xy coordinates of the nodes (constrained to fit within svg)
      nodes.attr('transform', function(d) {
        // return 'translate(' + d.x + ',' + d.y + ')';
        return 'translate(' + constrainCoord(d, 'x') + ',' + constrainCoord(d, 'y') + ')';
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

    /** Given an x or y coordinate of a node, constrain that coordinate between 0 (left/top) and width/height (right/bottom). */
    function constrainCoord(node: GraphNode, dimension: 'x' | 'y') {
      const constraint = dimension === 'x' ? width : height;

      // Can't go any closer to left/top than its radius
      const minCoord = node.radius;

      // Can't go any closer to right/bottom than width/height minus radius - except for x coord on non-centered text node, where we need even more room from right.
      let maxCoord = constraint - node.radius;
      if (dimension === 'x' && ! node.centeredText) {
        maxCoord -= node.textWidth + NODE_LABEL_SPACING + 5; // +5 to account for node.textWidth under-shooting actual width
      }

      return Math.max(minCoord, Math.min(maxCoord, node[dimension]));
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
