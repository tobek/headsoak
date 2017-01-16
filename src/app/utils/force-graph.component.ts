import {Component, Input, ViewChild, ElementRef, HostBinding, SimpleChanges} from '@angular/core';

import {Tag} from '../tags/';

import {Logger} from './';

import {Simulation, SimulationLinkDatum, SimulationNodeDatum, ForceLink} from 'd3-force';
import {Selection} from 'd3-selection';

import * as _ from 'lodash';

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
  tagInstance?: Tag,
  central?: boolean,
}
interface NodeDatum extends GraphNode, SimulationNodeDatum {
  radius: number,
  textWidth: number,
  centeredText: boolean,
  isFixed?: boolean,
}

/** Each link maps from node ID to node ID (in reality they're bidirectional but this is how the data is stored) while weight is the number coocurrences on notes. **/
export interface GraphLink {
  source: string,
  target: string,
  weight: number,
}
interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
  source: NodeDatum,
  target: NodeDatum,
  weight: number,
  width: number,
}

@Component({
  selector: 'force-graph',
  template: require('./force-graph.component.html')
})
export class ForceGraphComponent {
  @Input() graph: ForceGraph;
  @Input() highlightedTag?: Tag;

  /** When any tags are currently highlighted and/or hovered, we store the affected nodes here. */
  highlightedNodeData?: NodeDatum[];

  @ViewChild('svg') svgRef: ElementRef;

  /** D3 selection of svg element we use for visualization. */
  svg: Selection<SVGElement, any, null, undefined>;
  /** D3 force simulation. */
  simulation: Simulation<NodeDatum, LinkDatum>;

  nodeData: NodeDatum[];
  linkData: LinkDatum[];

  nodeEls: Selection<any, NodeDatum, SVGElement, any>;
  linkEls: Selection<any, LinkDatum, SVGElement, any>;

  numNodes: number;
  biggestNodeSize: number;
  heaviestLinkWeight: number;
  @HostBinding('class.is--crowded') isCrowded: boolean;

  @HostBinding('class.is--node-hovered') nodeHovered: boolean;

  /** Maps from node ID to a map of node ID connections. E.g. nodeConnections['node2']['node10'] === true if node2 is connected to node10. */
  nodeConnections: { [key: string]: {[key: string]: boolean} } = {};

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
  ) {
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['highlightedTag']) {
      this.higlightTag(changes['highlightedTag'].currentValue);
    }
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

    this.numNodes = _.size(this.graph.nodes);
    this.isCrowded = this.numNodes > 50;

    this.biggestNodeSize = _.reduce(
      this.graph.nodes,
      (biggest: number, node: NodeDatum) => {
        return Math.max(biggest, node.size);
      }, 0);

    const linkCounts = {}; // maps from node id to # of links it's part of
    let mostConnections = 10; // starting at 10 for most connections otherwise graphs with few connections are very tight
    this.heaviestLinkWeight = _.reduce(
      this.graph.links,
      (heaviest: number, link: GraphLink) => {
        // While we're at it, build up index that tells us how many connections each node has
        linkCounts[link.source] = (linkCounts[link.source] || 0) + 1;
        linkCounts[link.target] = (linkCounts[link.target] || 0) + 1;

        mostConnections = Math.max(mostConnections, linkCounts[link.source], linkCounts[link.target]);

        return Math.max(heaviest, link.weight);
      }, 5); // starting at 5 for heaviest link weight, otherwise lightly-connected graphs get tight cause of normalization across weights

    this.nodeData = _.map(this.graph.nodes, (node) => this.processNode(node));
    this.linkData = _.map(this.graph.links, (link) => this.processLink(link));

    const centralNodes = _.filter(this.nodeData, { central: true });
    if (centralNodes.length === 1) {
      centralNodes[0].fx = width / 2;
      centralNodes[0].fy = height / 2;
      // centralNodes[0].fy = centralNodes[0].radius + 5;
    }
    else if (centralNodes.length === 2) {
      centralNodes[0].fy = centralNodes[1].fy = height / 2;

      centralNodes[0].fx = centralNodes[0].radius + 5;
      centralNodes[1].fx = width - centralNodes[1].radius - 5;

      if (centralNodes[1].centeredText) {
        centralNodes[1].fx -= centralNodes[1].textWidth;
      }
    }
    // @TODO/visualization Arrange other quantities of central nodes too (as it is, they will have the fixed and central style, but won't actually be fixed)

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
        .strength((link: LinkDatum) => {
          const central = link.source.central || link.target.central;

          const avgConnections = (linkCounts[link.source.id] + linkCounts[link.target.id]) / 2;
          const minConnections = Math.min(linkCounts[link.source.id], linkCounts[link.target.id]);

          let baseStrength;

          // baseStrength = 0.1 - 0.095 * avgConnections/mostConnections;

          // // The higher the total number of links between the source and target combined, the lower the strength, so that densely packed nodes have more space to move around.
          // baseStrength = 0.2 / (linkCounts[link.source.id] + linkCounts[link.target.id] - 1);

          if (central) {
            if (centralNodes.length > 1) {
              // Multiple opposing central nodes (e.g. subtags) should definitely pull so you can see how related tags align
              baseStrength = 0.1;
            }
            else {
              // Let weak links go wherever
              baseStrength = link.weight > 1 ? 0.1 : 0;
            }
          }
          else {
            if (minConnections === 1) {
              // Single node attached to something, stay strong
              baseStrength = 0.5;
            }
            else if (avgConnections <= 4 || link.weight > 3) {
              // Small cluster, or strong link in a big cluster - these can stay strong
              baseStrength = 0.1;
            }
            else {
              // Weak link in a big cluster - let these go kind of wherever
              baseStrength = this.numNodes > 25 ? 0.001 : 0.01;
            }
          }

          // Adjust baseStrength +/- 50% based on relative weight
          return baseStrength * (0.5 + link.weight / this.heaviestLinkWeight);
        })
        .distance((link: LinkDatum) => {
          // default is 30

          // if (isCrowded) {
          //   return (d.source.radius + d.target.radius) * 1.5 + 25;
          // }
          // else {
          //   return (d.source.radius + d.target.radius) * 1.75 + 50;
          // }

          const minConnections = Math.min(linkCounts[link.source.id], linkCounts[link.target.id]);

          // The more connections the nodes of this link have, the further the natural distance, e.g. if nodes are highly connected then they get lots of room
          // let baseDistance = 20 + 5 * Math.sqrt(linkCounts[link.source.id] + linkCounts[link.target.id]);

          // normalized across 25-150 - the more connections the looser it is
          let baseDistance = 25 + 125 * minConnections/mostConnections;

          // heavier links are a little closer:
          baseDistance -= 25 * link.weight/this.heaviestLinkWeight;


          if (this.numNodes <= 10) {
            return baseDistance * 3;
          }
          else if (this.numNodes < 50) {
            return baseDistance * 2;
          }
          else {
            return baseDistance;
          }
        })
      )
      .force('collide', bboxCollide(function(node: NodeDatum) {
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
      .nodes(this.nodeData);

    (this.simulation.force('link') as ForceLink<NodeDatum, LinkDatum>)
      .links(this.linkData);

    this.linkEls = this.svg.selectAll('.link')
        .data(this.linkData)
      .enter().append('line')
        .attr('class', 'link')
        .classed('size1', function(d) {
          return d.weight <= 1;
        })
        .attr('stroke-width', function(d) {
          return d.width;
        });

    this.nodeEls = this.svg.selectAll('.node')
        .data(this.nodeData)
      .enter().append('g')
        .attr('class', function(d) {
          let classes = 'node';

          if (d.classAttr) {
            classes += ' ' + d.classAttr;
          }
          if (d.centeredText) {
            classes += ' is--text-centered';
          }
          if (d.central) {
            classes += ' is--central is--fixed';
          }

          return classes;
        })
        .call(d3.drag()
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded));

    this.nodeEls
      .on('mouseenter', (datum) => {
        this.highlightNodes([datum]);
      })
      .on('mouseleave', this.unHighlightNodes.bind(this))
      .on('click', nodeClick.bind(this));

    this.nodeEls.append('circle')
      .attr('r', function(d) {
        // Radius of node is number of notes this tag has, minimum size 3. sqrt to slow it down a bit (otherwise tag with 150 notes is giiigantic)
        return d.radius;
      });
      // .attr('fill', function(d) {
      //   // Right now our only coloring criteria is if it's programmatic or not
      //   return color(!! d.prog);
      // });
      // Let's color with CSS:

    this.nodeEls.append('text')
      .attr('text-anchor', function(d) {
        return d.centeredText ? 'middle' : null
      })
      .attr('dx', (d) => {
        return d.centeredText ? 0 : (NODE_LABEL_SPACING + d.radius);
      })
      .attr('dy', '.35em')
      .classed('size1', function(d) {
        // Fade (until hover) certain tags to make it less crowded
        // (Used to not fade ones with no pairs, cause those float to the outside so plenty of room for text. But that's a bit confusing looking.)
        // return d.size <= 1 && this.pairCount[d.id])
        return d.size <=1;
      })
      .html(function(d) {
        return '<tspan class="hash">#</tspan>' + d.name;
      });

    this.simulation.on('tick', ticked.bind(this));

    function ticked() {
      // @NOTE Normally here you would just take the x/y coords tracked internally by D3 and set the appropriate svg attributes to actually arrange the graph. Here we instead constrain D3's values to fit within width/height of svg. *We are actually already constraining to this bound with the `bound` force* - however, both sets of constraints are needed. If we only use the force, then nodes momentarily get pushed off the edge, and sometimes stay there if there are strong enough competing forces. If we only use the constraint here when translating into svg attributes, then we appear to get a hard bound that nodes never cross, but since D3's internal tracking of coordinates is unaffected, some nodes that *seem* to be at the edge are actually outside according to D3 are outside. These nodes then act in unexpected ways: they do not collide with other nodes that appear to overlap, dragging behavior is weird, etc. So we use both sets of constraints.

      // Set the xy coordinates of the source and target ends of the links (constrained to fit within svg)
      this.linkEls
        .attr('x1', function(d) { return constrainCoord(d.source, 'x'); })
        .attr('y1', function(d) { return constrainCoord(d.source, 'y'); })
        .attr('x2', function(d) { return constrainCoord(d.target, 'x'); })
        .attr('y2', function(d) { return constrainCoord(d.target, 'y'); });

      // Set the xy coordinates of the nodes (constrained to fit within svg)
      this.nodeEls.attr('transform', function(d) {
        // return 'translate(' + d.x + ',' + d.y + ')';
        return 'translate(' + constrainCoord(d, 'x') + ',' + constrainCoord(d, 'y') + ')';
      });
    }

    function nodeClick(node: NodeDatum) {
      if (node.tagInstance) {
        node.tagInstance.goTo();
      }
    }

    const simulation = this.simulation
    function dragStarted (d) {
      if (! d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged (d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }
    function dragEnded (d) {
      if (! d3.event.active) simulation.alphaTarget(0);

      if (d.isFixed) {
        // now unfix it
        d.fx = null;
        d.fy = null;
      }
        
      d.isFixed = ! d.isFixed;

      this.classList[d.isFixed ? 'add' : 'remove']('is--fixed');
    }

    /** Given an x or y coordinate of a node, constrain that coordinate between 0 (left/top) and width/height (right/bottom). */
    function constrainCoord(node: NodeDatum, dimension: 'x' | 'y') {
      const constraint = dimension === 'x' ? width : height;

      // In y dimension minimum radius should be 6px to accommodate 12px tall text
      let radius = dimension === 'y' ? Math.max(node.radius, 6) : node.radius;

      radius += 5; // account for stroke width (which can be up to 5 if it's fixed)

      // Can't go any closer to left/top than its radius
      const minCoord = radius;

      // Can't go any closer to right/bottom than width/height minus radius - except for x coord on non-centered text node, where we need even more room from right.
      let maxCoord = constraint - radius;
      if (dimension === 'x' && ! node.centeredText) {
        maxCoord -= node.textWidth + NODE_LABEL_SPACING + 5; // +5 to account for node.textWidth under-shooting actual width
      }

      return Math.max(minCoord, Math.min(maxCoord, node[dimension]));
    }

    this._logger.timeEnd('Initialized D3 graph');
  }

  highlightNodes(hoveredNodes: NodeDatum[]) {
    this.nodeHovered = true;
    this.highlightedNodeData = hoveredNodes;

    _.each(hoveredNodes, (hoveredNode) => {
      hoveredNode.fx = hoveredNode.x;
      hoveredNode.fy = hoveredNode.y;
    });

    this.nodeEls.classed('is--connected', (node: NodeDatum) => {
      if (_.includes(hoveredNodes, node)) {
        // This node is one of the hovered nodes
        return true;
      }
      if (this.nodeConnections[node.id]) {
        // Let's see if this node is connected to any of the hovered nodes
        for (let i = hoveredNodes.length - 1; i >= 0; i--) {
          if (this.nodeConnections[node.id][hoveredNodes[i].id]) {
            return true;
          }
        }
      }

      return false;
    });

    this.linkEls.classed('is--connected', function(link: LinkDatum) {
      if (_.includes(hoveredNodes, link.source) || _.includes(hoveredNodes, link.target)) {
        // We're connected to at least one of the hovered nodes
        return true;
      }
      return false;
    });
  }

  unHighlightNodes() {
    this.nodeHovered = false;

    if (this.highlightedNodeData) {
      // Release any unfixed nodes that we temporarily fixed in place cause of hover
      _.each(this.highlightedNodeData, (highlightedNodeDatum) => {
        if (! highlightedNodeDatum.isFixed) {
          highlightedNodeDatum.fx = highlightedNodeDatum.fy = null;
        }
      });

      this.highlightedNodeData = null;
    }

    if (this.nodeEls) { // might not be initialized yet
      this.nodeEls.classed('is--highlighted', false);
    }
  }

  higlightTag(tag: Tag) {
    if (! tag) {
      this.unHighlightNodes();
      return;
    }

    let higlightNodeEls;
    if (_.size(tag.subTagDocs)) {
      // This is a tag with subtags, and since we break out individual subtags and don't show the parent in the viz, let's highlight all of them.
      const subTagIds = tag.getSubTagIds();
      higlightNodeEls = this.nodeEls.filter((nodeEl) => _.includes(subTagIds, nodeEl.id));
    }
    else {
      higlightNodeEls = this.nodeEls.filter((nodeEl) => nodeEl.id === tag.id);
    }

    if (! higlightNodeEls.size()) {
      this._logger.info('Can\'t highlight tag - no node found in graph for tag', tag);
      return;
    }

    higlightNodeEls.classed('is--highlighted', true);
    this.highlightNodes(higlightNodeEls.data());
  }

  /** Somewhat normalizes radius based on # of notes a tag is on. Could need tweaking but should do for a while! */
  nodeRadius(node: GraphNode) {
    if (this.biggestNodeSize > 40) {
      // From 3px up to 30px for a tag with 100 notes, up to ~100px for a tag with 1000 notes
      return Math.sqrt(node.size) * 3 || 3;
    }
    else {
      // 1.5th root - steeper at first so larger radii for tags with fewer notes, but still levels off
      return Math.pow(node.size, 1/1.5) * 4 || 4;
    }
  }

  processNode(node: GraphNode): NodeDatum {
    const radius = this.nodeRadius(node);

    // In current font size we average 5.2px/char. Calculated using the following in console on tag browser page:
    //   _.mean(_.map(document.querySelectorAll('svg text'), function(node) { return (parseInt(window.getComputedStyle(node).width)/node.innerHTML.length) }))
    const textWidth = (node.name.length + 1) * 5.2; // +1 to account for `#` symbol

    return _.assign(node, {
      radius: radius,
      textWidth: textWidth,
      centeredText: radius * 2 - textWidth > 6,
      isFixed: node.central, // starts off fixed but can be unfixed by dragging
    });
  }

  /** Initializes `nodeConnections` as a side effect */
  processLink(link: GraphLink): LinkDatum {
    // We do want to slow down massive increases using sqrt, but we also don't want 2 cooccurrences to be indistinguishable from 1, so multiply it. But we want to start at 1px, so subtract down to that for weight 1:
    let width: number;
    if (this.heaviestLinkWeight > 10) {
      width = Math.sqrt(link.weight) * 2 - 1;
    }
    else {
      width = Math.sqrt(link.weight) * 3 - 2;
    }

    if (! this.nodeConnections[link.source]) {
      this.nodeConnections[link.source] = {};
    }
    if (! this.nodeConnections[link.target]) {
      this.nodeConnections[link.target] = {};
    }

    this.nodeConnections[link.source][link.target] = true;
    this.nodeConnections[link.target][link.source] = true;

    return _.assign(link, {
      // Very ugly double type assertion - source and target are actually ID strings here, but as soon as we feed these into the simulation they'll get reassinged to NodeDatum, so let's assert that here to squeeze return object into LinkDatum type
      source: link.source as any as NodeDatum,
      target: link.target as any as NodeDatum,

      width: width,
    });
  }
}
