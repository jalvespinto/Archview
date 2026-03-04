import type cytoscape from 'cytoscape';
import type { DiagramData } from '../types';

type DiagramNode = DiagramData['nodes'][number];
type DiagramEdge = DiagramData['edges'][number];

export function toCytoscapeNodeElement(node: DiagramNode): cytoscape.ElementDefinition {
  return {
    group: 'nodes',
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      language: node.language,
      filePaths: node.filePaths,
      fileCount: node.filePaths.length
    },
    style: {
      'background-color': node.style.color,
      'shape': node.style.shape,
      'width': node.style.size,
      'height': node.style.size,
      'border-width': node.style.borderWidth,
      'border-color': '#333'
    },
    position: node.position
  };
}

export function toCytoscapeEdgeElement(edge: DiagramEdge): cytoscape.ElementDefinition {
  return {
    group: 'edges',
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type
    },
    style: {
      'line-color': edge.style.color,
      'width': edge.style.width,
      'line-style': edge.style.lineStyle,
      'target-arrow-shape': edge.style.arrow ? 'triangle' : 'none',
      'target-arrow-color': edge.style.color,
      'curve-style': 'bezier'
    }
  };
}
