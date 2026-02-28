/**
 * Webview script - Runs in browser context
 * Handles messaging with extension and initializes DiagramRenderer
 * Requirements: 5.4, 6.5, 7.1, 3.1, 11.1
 */

(function() {
  'use strict';

  // Get VS Code API for messaging (provided by webview runtime)
  const vscode = acquireVsCodeApi();

  // State management
  let diagramRenderer = null;
  let currentDiagramData = null;
  let currentAbstractionLevel = 2; // Default to Module level

  /**
   * Initialize the webview
   */
  function initialize() {
    console.log('Initializing webview...');

    // Get DOM elements
    const container = document.getElementById('diagram-container');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const fitViewBtn = document.getElementById('fit-view');
    const abstractionSelect = document.getElementById('abstraction-level');
    const exportPngBtn = document.getElementById('export-png');
    const exportSvgBtn = document.getElementById('export-svg');
    const refreshBtn = document.getElementById('refresh');

    // Initialize DiagramRenderer
    // Note: DiagramRenderer will be bundled with this script
    // For now, we'll create a placeholder
    diagramRenderer = createDiagramRenderer(container);

    // Set up control event listeners
    zoomInBtn.addEventListener('click', handleZoomIn);
    zoomOutBtn.addEventListener('click', handleZoomOut);
    fitViewBtn.addEventListener('click', handleFitView);
    abstractionSelect.addEventListener('change', handleAbstractionLevelChange);
    exportPngBtn.addEventListener('click', handleExportPNG);
    exportSvgBtn.addEventListener('click', handleExportSVG);
    refreshBtn.addEventListener('click', handleRefresh);

    // Set up message listener from extension
    window.addEventListener('message', handleMessage);

    // Request initial diagram data
    sendMessage({ type: 'ready' });
  }

  /**
   * Create diagram renderer instance
   * This is a placeholder - actual DiagramRenderer will be bundled
   */
  function createDiagramRenderer(container) {
    // Placeholder implementation
    // In production, this would use the actual DiagramRenderer class
    return {
      initialize: function(container) {
        console.log('DiagramRenderer initialized');
      },
      renderDiagram: function(data) {
        console.log('Rendering diagram:', data);
      },
      zoomIn: function() {
        console.log('Zoom in');
      },
      zoomOut: function() {
        console.log('Zoom out');
      },
      fitToView: function() {
        console.log('Fit to view');
      },
      selectElement: function(elementId) {
        console.log('Select element:', elementId);
      },
      clearSelection: function() {
        console.log('Clear selection');
      },
      exportToPNG: function() {
        console.log('Export to PNG');
        return new Blob(['fake png'], { type: 'image/png' });
      },
      exportToSVG: function() {
        console.log('Export to SVG');
        return '<svg></svg>';
      },
      onElementClick: function(handler) {
        console.log('Element click handler registered');
      },
      onElementHover: function(handler) {
        console.log('Element hover handler registered');
      }
    };
  }

  /**
   * Handle messages from extension
   */
  function handleMessage(event) {
    const message = event.data;
    console.log('Received message:', message);

    switch (message.type) {
      case 'initialize':
        handleInitializeMessage(message.data);
        break;
      case 'abstractionLevelChanged':
        handleAbstractionLevelChangedMessage(message.level);
        break;
      case 'diagramOutOfSync':
        handleDiagramOutOfSync(message.timestamp);
        break;
      case 'diagramRefreshed':
        handleDiagramRefreshed();
        break;
      case 'error':
        handleErrorMessage(message.message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handle initialize message - set up diagram
   * Requirements: 3.1
   */
  function handleInitializeMessage(data) {
    console.log('Initializing diagram with data:', data);
    currentDiagramData = data;

    hideLoading();
    hideError();

    if (diagramRenderer) {
      diagramRenderer.renderDiagram(data);

      // Set up element interaction handlers
      diagramRenderer.onElementClick(function(elementId) {
        if (elementId) {
          sendMessage({
            type: 'elementSelected',
            elementId: elementId
          });
        }
      });

      diagramRenderer.onElementHover(function(elementId) {
        if (elementId) {
          sendMessage({
            type: 'elementHovered',
            elementId: elementId
          });
        }
      });
    }
  }

  /**
   * Handle abstraction level changed message
   * Requirements: 6.5
   */
  function handleAbstractionLevelChangedMessage(level) {
    console.log('Abstraction level changed:', level);
    currentAbstractionLevel = level;

    // Update select dropdown
    const select = document.getElementById('abstraction-level');
    if (select) {
      select.value = level.toString();
    }

    // Re-render diagram with new abstraction level
    if (currentDiagramData && diagramRenderer) {
      const filteredData = filterDiagramByAbstractionLevel(currentDiagramData, level);
      diagramRenderer.renderDiagram(filteredData);
    }
  }

  /**
   * Handle error message
   */
  function handleErrorMessage(message) {
    console.error('Error:', message);
    hideLoading();
    showError(message);
  }

  /**
   * Handle diagram out of sync notification
   * Requirements: 11.5
   */
  function handleDiagramOutOfSync(timestamp) {
    console.log('Diagram is out of sync:', timestamp);
    showSyncIndicator();
  }

  /**
   * Handle diagram refreshed notification
   * Requirements: 11.5
   */
  function handleDiagramRefreshed() {
    console.log('Diagram refreshed');
    hideSyncIndicator();
  }

  /**
   * Send message to extension
   */
  function sendMessage(message) {
    console.log('Sending message:', message);
    vscode.postMessage(message);
  }

  /**
   * Handle zoom in button click
   * Requirements: 5.2
   */
  function handleZoomIn() {
    if (diagramRenderer) {
      diagramRenderer.zoomIn();
    }
  }

  /**
   * Handle zoom out button click
   * Requirements: 5.2
   */
  function handleZoomOut() {
    if (diagramRenderer) {
      diagramRenderer.zoomOut();
    }
  }

  /**
   * Handle fit view button click
   * Requirements: 5.4
   */
  function handleFitView() {
    if (diagramRenderer) {
      diagramRenderer.fitToView();
    }
  }

  /**
   * Handle abstraction level change
   * Requirements: 6.5
   */
  function handleAbstractionLevelChange(event) {
    const level = parseInt(event.target.value, 10);
    currentAbstractionLevel = level;

    sendMessage({
      type: 'abstractionLevelChanged',
      level: level
    });

    // Filter and re-render diagram
    if (currentDiagramData && diagramRenderer) {
      const filteredData = filterDiagramByAbstractionLevel(currentDiagramData, level);
      diagramRenderer.renderDiagram(filteredData);
    }
  }

  /**
   * Handle export PNG button click
   * Requirements: 7.1
   */
  function handleExportPNG() {
    if (!diagramRenderer) return;

    try {
      const blob = diagramRenderer.exportToPNG();
      
      // Send export request to extension
      sendMessage({
        type: 'exportRequested',
        format: 'png'
      });

      // Note: Actual file saving will be handled by extension
      console.log('PNG export requested');
    } catch (error) {
      console.error('Error exporting PNG:', error);
      showError('Failed to export PNG: ' + error.message);
    }
  }

  /**
   * Handle export SVG button click
   * Requirements: 7.1
   */
  function handleExportSVG() {
    if (!diagramRenderer) return;

    try {
      const svg = diagramRenderer.exportToSVG();
      
      // Send export request to extension
      sendMessage({
        type: 'exportRequested',
        format: 'svg'
      });

      // Note: Actual file saving will be handled by extension
      console.log('SVG export requested');
    } catch (error) {
      console.error('Error exporting SVG:', error);
      showError('Failed to export SVG: ' + error.message);
    }
  }

  /**
   * Handle refresh button click
   * Requirements: 11.1
   */
  function handleRefresh() {
    showLoading();
    sendMessage({
      type: 'refreshRequested'
    });
  }

  /**
   * Filter diagram data by abstraction level
   * Requirements: 6.5
   */
  function filterDiagramByAbstractionLevel(data, level) {
    if (!data) return data;

    // Filter nodes by abstraction level
    const filteredNodes = data.nodes.filter(node => {
      // Assuming nodes have an abstractionLevel property
      // If not present, include all nodes
      return !node.abstractionLevel || node.abstractionLevel <= level;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = data.edges.filter(edge => {
      return nodeIds.has(edge.source) && nodeIds.has(edge.target);
    });

    return {
      ...data,
      nodes: filteredNodes,
      edges: filteredEdges,
      abstractionLevel: level
    };
  }

  /**
   * Show loading indicator
   */
  function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'block';
    }
  }

  /**
   * Hide loading indicator
   */
  function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    const error = document.getElementById('error');
    const errorMessage = error.querySelector('.error-message');
    if (error && errorMessage) {
      errorMessage.textContent = message;
      error.style.display = 'block';
    }
  }

  /**
   * Hide error message
   */
  function hideError() {
    const error = document.getElementById('error');
    if (error) {
      error.style.display = 'none';
    }
  }

  /**
   * Show sync indicator
   * Requirements: 11.5
   */
  function showSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  /**
   * Hide sync indicator
   * Requirements: 11.5
   */
  function hideSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
