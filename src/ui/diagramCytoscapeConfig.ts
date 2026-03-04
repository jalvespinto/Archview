import type cytoscape from 'cytoscape';
import { defaultStyles } from './diagramStyles';

export function createDiagramCytoscapeOptions(container: HTMLElement): cytoscape.CytoscapeOptions {
  return {
    container,
    style: defaultStyles as cytoscape.StylesheetJson,
    minZoom: 0.25,
    maxZoom: 4.0,
    wheelSensitivity: 0.2,
    // Performance optimizations (Requirements: 2.7)
    hideEdgesOnViewport: true, // Hide edges during viewport changes
    textureOnViewport: true, // Use texture during viewport changes
    motionBlur: false, // Disable motion blur for performance
    pixelRatio: 'auto',
    // Enable virtualization for large graphs (Requirements: 2.7)
    hideLabelsOnViewport: true // Hide labels during pan/zoom
  };
}
