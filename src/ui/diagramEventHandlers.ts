import type { Core, NodeSingular } from 'cytoscape';

export interface DiagramEventHandlerBindings {
  clearSelection: () => void;
  getOnElementClickHandler: () => ((elementId: string) => void) | null;
  getOnElementHoverHandler: () => ((elementId: string) => void) | null;
  hideTooltip: () => void;
  showTooltip: (node: NodeSingular) => void;
}

export function setupDiagramEventHandlers(
  cy: Core,
  bindings: DiagramEventHandlerBindings
): void {
  // Click on node
  cy.on('tap', 'node', (event) => {
    const node = event.target as NodeSingular;
    const elementId = node.id();
    const handler = bindings.getOnElementClickHandler();
    if (handler) {
      handler(elementId);
    }
  });

  // Hover on node - show tooltip
  cy.on('mouseover', 'node', (event) => {
    const node = event.target as NodeSingular;
    const elementId = node.id();

    bindings.showTooltip(node);

    const handler = bindings.getOnElementHoverHandler();
    if (handler) {
      handler(elementId);
    }
  });

  // Mouse out - hide tooltip
  cy.on('mouseout', 'node', () => {
    bindings.hideTooltip();
  });

  // Click on background - clear selection
  cy.on('tap', (event) => {
    if (event.target === cy) {
      bindings.clearSelection();
      const handler = bindings.getOnElementClickHandler();
      if (handler) {
        handler('');
      }
    }
  });
}
