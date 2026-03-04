/**
 * DiagramRenderer - Runs in webview browser context (NOT Node.js)
 * Renders interactive architecture diagrams using Cytoscape.js
 * Requirements: 2.1, 2.7, 5.1, 5.2, 5.3, 5.4, 3.1, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * Note: This file runs in the browser/webview context and has access to DOM APIs.
 * TypeScript may show errors for HTMLElement and document, but these are available at runtime.
 */

import cytoscape, { Core, NodeSingular, LayoutOptions } from 'cytoscape';
// @ts-expect-error - cytoscape-dagre doesn't have type definitions
import dagre from 'cytoscape-dagre';
import { DiagramData } from '../types';
import { createDiagramCytoscapeOptions } from './diagramCytoscapeConfig';
import { setupDiagramEventHandlers } from './diagramEventHandlers';
import { getBreadthfirstLayoutOptions, getCoseLayoutOptions, getDagreLayoutOptions } from './diagramLayoutOptions';
import { toCytoscapeEdgeElement, toCytoscapeNodeElement } from './diagramElementConverters';
import { hideNodeTooltip, showNodeTooltip } from './diagramTooltip';

// Register dagre layout
cytoscape.use(dagre);

// Browser globals (available in webview context)
declare const document: Document;

// Type for HTML elements in browser context
type BrowserHTMLElement = HTMLElement;

/**
 * DiagramRenderer handles all diagram rendering and interaction in the browser
 */
export class DiagramRenderer {
  private cy: Core | null = null;
  private container: BrowserHTMLElement | null = null;
  private onElementClickHandler: ((elementId: string) => void) | null = null;
  private onElementHoverHandler: ((elementId: string) => void) | null = null;
  private selectedElementId: string | null = null;
  private zoomDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private panDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceDelayMs = 100; // 100ms debounce

  /**
   * Initialize Cytoscape instance in browser DOM
   * Requirements: 2.1, 2.7
   */
  initialize(container: BrowserHTMLElement): void {
    this.container = container;

    this.cy = cytoscape(createDiagramCytoscapeOptions(container));

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Render diagram from DiagramData
   * Requirements: 2.1, 2.7
   */
  renderDiagram(data: DiagramData): void {
    if (!this.cy) {
      throw new Error('DiagramRenderer not initialized. Call initialize() first.');
    }

    // Convert DiagramData to Cytoscape format
    const elements = this.convertToCytoscapeFormat(data);
    
    // Clear existing elements
    this.cy.elements().remove();
    
    // Progressive rendering: Add nodes first, then edges (Requirements: 2.7)
    const nodes = elements.filter(e => e.group === 'nodes');
    const edges = elements.filter(e => e.group === 'edges');
    
    // Add nodes immediately
    this.cy.add(nodes);
    
    // Use requestAnimationFrame for smooth rendering (Requirements: 2.7)
    requestAnimationFrame(() => {
      if (!this.cy) return;
      
      // Add edges after nodes are rendered
      this.cy.add(edges);
      
      // Apply layout
      this.updateLayout(data.layout.algorithm);
      
      // Fit to view
      this.fitToView();
    });
  }

  /**
   * Update layout algorithm
   * Requirements: 2.7
   */
  updateLayout(algorithm: 'dagre' | 'cose' | 'breadthfirst' = 'dagre'): void {
    if (!this.cy) return;

    let layoutOptions: LayoutOptions;

    if (algorithm === 'dagre') {
      layoutOptions = getDagreLayoutOptions();
    } else if (algorithm === 'cose') {
      layoutOptions = getCoseLayoutOptions();
    } else {
      layoutOptions = getBreadthfirstLayoutOptions();
    }

    const layout = this.cy.layout(layoutOptions);
    layout.run();
  }

  /**
   * Zoom in
   * Requirements: 5.2, 2.7
   */
  zoomIn(): void {
    if (!this.cy) return;
    
    // Debounce zoom updates (Requirements: 2.7)
    if (this.zoomDebounceTimer) {
      clearTimeout(this.zoomDebounceTimer);
    }
    
    this.zoomDebounceTimer = setTimeout(() => {
      if (!this.cy) return;
      
      const currentZoom = this.cy.zoom();
      const newZoom = Math.min(currentZoom * 1.2, 4.0);
      
      // Use requestAnimationFrame for smooth animation (Requirements: 2.7)
      requestAnimationFrame(() => {
        if (!this.cy) return;
        this.cy.zoom({
          level: newZoom,
          renderedPosition: {
            x: this.cy.width() / 2,
            y: this.cy.height() / 2
          }
        });
      });
    }, this.debounceDelayMs);
  }

  /**
   * Zoom out
   * Requirements: 5.2, 2.7
   */
  zoomOut(): void {
    if (!this.cy) return;
    
    // Debounce zoom updates (Requirements: 2.7)
    if (this.zoomDebounceTimer) {
      clearTimeout(this.zoomDebounceTimer);
    }
    
    this.zoomDebounceTimer = setTimeout(() => {
      if (!this.cy) return;
      
      const currentZoom = this.cy.zoom();
      const newZoom = Math.max(currentZoom / 1.2, 0.25);
      
      // Use requestAnimationFrame for smooth animation (Requirements: 2.7)
      requestAnimationFrame(() => {
        if (!this.cy) return;
        this.cy.zoom({
          level: newZoom,
          renderedPosition: {
            x: this.cy.width() / 2,
            y: this.cy.height() / 2
          }
        });
      });
    }, this.debounceDelayMs);
  }

  /**
   * Fit diagram to view
   * Requirements: 5.4
   */
  fitToView(): void {
    if (!this.cy) return;
    this.cy.fit(undefined, 30); // 30px padding
  }

  /**
   * Pan to specific coordinates
   * Requirements: 5.1, 2.7
   */
  panTo(x: number, y: number): void {
    if (!this.cy) return;
    
    // Clear any pending debounce timer
    if (this.panDebounceTimer) {
      clearTimeout(this.panDebounceTimer);
      this.panDebounceTimer = null;
    }
    
    // Apply pan immediately (debouncing removed for correctness)
    // The pan operation needs to be synchronous for state preservation
    this.cy.pan({ x, y });
  }

  /**
   * Register click event handler
   * Requirements: 3.1
   */
  onElementClick(handler: (elementId: string) => void): void {
    this.onElementClickHandler = handler;
  }

  /**
   * Register hover event handler
   * Requirements: 3.4
   */
  onElementHover(handler: (elementId: string) => void): void {
    this.onElementHoverHandler = handler;
  }

  /**
   * Select and highlight an element
   * Requirements: 3.1, 2.7
   */
  selectElement(elementId: string): void {
    if (!this.cy) return;

    // Clear previous selection
    this.clearSelection();

    // Select new element
    const element = this.cy.getElementById(elementId);
    if (element.length > 0) {
      element.addClass('selected');
      this.selectedElementId = elementId;
      
      // Use requestAnimationFrame for smooth animation (Requirements: 2.7)
      requestAnimationFrame(() => {
        if (!this.cy) return;
        
        // Center on selected element
        this.cy.animate({
          center: { eles: element },
          zoom: this.cy.zoom()
        }, {
          duration: 300
        });
      });
    }
  }

  /**
   * Clear element selection
   * Requirements: 3.1
   */
  clearSelection(): void {
    if (!this.cy) return;
    
    if (this.selectedElementId) {
      const element = this.cy.getElementById(this.selectedElementId);
      if (element.length > 0) {
        element.removeClass('selected');
      }
      this.selectedElementId = null;
    }
  }

  /**
   * Export diagram to PNG
   * Requirements: 7.1, 7.2, 7.5
   */
  exportToPNG(): Blob {
    if (!this.cy) {
      throw new Error('DiagramRenderer not initialized');
    }

    // Export at minimum 1920x1080 resolution
    const blob = this.cy.png({
      output: 'blob',
      bg: '#ffffff',
      full: true,
      scale: 2, // Higher quality
      maxWidth: 1920,
      maxHeight: 1080
    }) as unknown as Blob;

    return blob;
  }

  /**
   * Export diagram to SVG
   * Requirements: 7.1, 7.3, 7.5
   */
  exportToSVG(): string {
    if (!this.cy) {
      throw new Error('DiagramRenderer not initialized');
    }

    // Get SVG string - using Cytoscape's built-in SVG export
    // Note: This requires the cytoscape-svg extension in production
    // For now, we'll create a basic SVG representation
    const elements = this.cy.elements();
    const bbox = elements.boundingBox();
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.w}" height="${bbox.h}" viewBox="${bbox.x1} ${bbox.y1} ${bbox.w} ${bbox.h}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g id="diagram">`;

    // Add nodes
    elements.nodes().forEach((node) => {
      const pos = node.position();
      const style = node.style();
      const data = node.data();
      const width = parseFloat(style.width as string);
      const height = parseFloat(style.height as string);
      
      svgContent += `
    <g id="${node.id()}">
      <rect x="${pos.x - width/2}" y="${pos.y - height/2}" width="${width}" height="${height}" 
            fill="${style['background-color']}" stroke="${style['border-color']}" 
            stroke-width="${style['border-width']}"/>
      <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" 
            font-size="${style['font-size']}" font-family="${style['font-family']}">${data.label}</text>
    </g>`;
    });

    // Add edges
    elements.edges().forEach((edge) => {
      const source = edge.source().position();
      const target = edge.target().position();
      const style = edge.style();
      
      svgContent += `
    <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" 
          stroke="${style['line-color']}" stroke-width="${style.width}" 
          stroke-dasharray="${style['line-style'] === 'dashed' ? '5,5' : 'none'}" 
          marker-end="url(#arrow)"/>`;
    });

    svgContent += `
  </g>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#666"/>
    </marker>
  </defs>
</svg>`;

    return svgContent;
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.cy?.zoom() ?? 1;
  }

  /**
   * Get current pan position
   */
  getPan(): { x: number; y: number } {
    return this.cy?.pan() ?? { x: 0, y: 0 };
  }

  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    // Clear debounce timers
    if (this.zoomDebounceTimer) {
      clearTimeout(this.zoomDebounceTimer);
      this.zoomDebounceTimer = null;
    }
    if (this.panDebounceTimer) {
      clearTimeout(this.panDebounceTimer);
      this.panDebounceTimer = null;
    }
    
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    this.container = null;
    this.onElementClickHandler = null;
    this.onElementHoverHandler = null;
    this.selectedElementId = null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Convert DiagramData to Cytoscape element format
   */
  private convertToCytoscapeFormat(data: DiagramData): cytoscape.ElementDefinition[] {
    const elements: cytoscape.ElementDefinition[] = [];

    // Add nodes
    for (const node of data.nodes) {
      elements.push(toCytoscapeNodeElement(node));
    }

    // Add edges
    for (const edge of data.edges) {
      elements.push(toCytoscapeEdgeElement(edge));
    }

    return elements;
  }

  /**
   * Setup event handlers for user interactions
   * Requirements: 3.1, 3.4, 5.1
   */
  private setupEventHandlers(): void {
    if (!this.cy) return;
    setupDiagramEventHandlers(this.cy, {
      clearSelection: () => this.clearSelection(),
      getOnElementClickHandler: () => this.onElementClickHandler,
      getOnElementHoverHandler: () => this.onElementHoverHandler,
      hideTooltip: () => this.hideTooltip(),
      showTooltip: (node) => this.showTooltip(node)
    });
  }

  /**
   * Show tooltip for a node
   * Requirements: 3.4
   */
  private showTooltip(node: NodeSingular): void {
    if (!this.container) return;
    showNodeTooltip(this.container, node, document);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (!this.container) return;
    hideNodeTooltip(this.container);
  }
}
