import type cytoscape from 'cytoscape';

export const defaultNodeStyle: cytoscape.StylesheetJsonBlock = {
  selector: 'node',
  style: {
    'label': 'data(label)',
    'text-valign': 'center',
    'text-halign': 'center',
    'font-size': '12px',
    'font-family': 'Arial, sans-serif',
    'text-wrap': 'wrap',
    'text-max-width': '100px',
    'color': '#000',
    'text-outline-color': '#fff',
    'text-outline-width': 2,
    'min-zoomed-font-size': 8
  }
};

export const selectedNodeStyle: cytoscape.StylesheetJsonBlock = {
  selector: 'node.selected',
  style: {
    'border-width': 4,
    'border-color': '#0066cc',
    'background-color': '#e6f2ff'
  }
};

export const activeNodeStyle: cytoscape.StylesheetJsonBlock = {
  selector: 'node:active',
  style: {
    'overlay-opacity': 0.2,
    'overlay-color': '#0066cc'
  }
};

export const defaultEdgeStyle: cytoscape.StylesheetJsonBlock = {
  selector: 'edge',
  style: {
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    'arrow-scale': 1.5,
    'opacity': 0.7
  }
};

export const selectedEdgeStyle: cytoscape.StylesheetJsonBlock = {
  selector: 'edge.selected',
  style: {
    'width': 3,
    'opacity': 1,
    'line-color': '#0066cc',
    'target-arrow-color': '#0066cc'
  }
};

export const defaultStyles: cytoscape.StylesheetJson = [
  defaultNodeStyle,
  selectedNodeStyle,
  activeNodeStyle,
  defaultEdgeStyle,
  selectedEdgeStyle
];
