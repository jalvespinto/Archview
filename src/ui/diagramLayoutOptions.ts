import type { LayoutOptions } from 'cytoscape';

export function getDagreLayoutOptions(): LayoutOptions {
  return {
    name: 'dagre',
    // @ts-expect-error - dagre-specific options
    rankDir: 'TB', // Top to bottom
    nodeSep: 50,
    edgeSep: 10,
    rankSep: 100,
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 30
  };
}

export function getCoseLayoutOptions(): LayoutOptions {
  return {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    fit: true,
    padding: 30
  };
}

export function getBreadthfirstLayoutOptions(): LayoutOptions {
  return {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 30
  };
}
