/**
 * WebviewMessageHandler - Handles messages between extension and webview
 * Requirements: 3.1, 6.5, 7.1, 11.1
 */

import { WebviewMessage, DiagramData, AbstractionLevel } from '../types';
import { WebviewManager } from './WebviewManager';
import { FileHighlighter } from './FileHighlighter';
import { FileMappingService } from './FileMappingService';

/**
 * Callback types for message handling
 */
export interface MessageHandlerCallbacks {
  onElementSelected?: (elementId: string) => void;
  onElementHovered?: (elementId: string) => void;
  onAbstractionLevelChanged?: (level: AbstractionLevel) => void;
  onExportRequested?: (format: 'png' | 'svg') => void;
  onRefreshRequested?: () => void;
  onFileClicked?: (filePath: string) => void;
}

/**
 * WebviewMessageHandler coordinates message handling between webview and extension
 */
export class WebviewMessageHandler {
  private webviewManager: WebviewManager;
  private fileHighlighter: FileHighlighter;
  private fileMappingService: FileMappingService;
  private callbacks: MessageHandlerCallbacks;
  private currentDiagramData: DiagramData | null = null;

  constructor(
    webviewManager: WebviewManager,
    fileHighlighter: FileHighlighter,
    fileMappingService: FileMappingService,
    callbacks: MessageHandlerCallbacks = {}
  ) {
    this.webviewManager = webviewManager;
    this.fileHighlighter = fileHighlighter;
    this.fileMappingService = fileMappingService;
    this.callbacks = callbacks;

    // Register message handler
    this.setupMessageHandling();
  }

  /**
   * Set current diagram data for reference
   * Updates file mappings when diagram data changes
   */
  setDiagramData(data: DiagramData): void {
    this.currentDiagramData = data;
    // Update file mappings
    this.fileMappingService.updateMappings(data);
  }

  /**
   * Set up message handling from webview
   */
  private setupMessageHandling(): void {
    this.webviewManager.onMessage((message: WebviewMessage) => {
      this.handleMessage(message);
    });
  }

  /**
   * Handle incoming messages from webview
   */
  private handleMessage(message: WebviewMessage): void {
    console.log('Handling message:', message);

    switch (message.type) {
      case 'initialize':
        this.handleInitialize(message.data);
        break;
      case 'elementSelected':
        this.handleElementSelected(message.elementId);
        break;
      case 'elementHovered':
        this.handleElementHovered(message.elementId);
        break;
      case 'abstractionLevelChanged':
        this.handleAbstractionLevelChanged(message.level);
        break;
      case 'exportRequested':
        this.handleExportRequested(message.format);
        break;
      case 'refreshRequested':
        this.handleRefreshRequested();
        break;
      case 'error':
        this.handleError(message.message);
        break;
      default:
        console.warn('Unknown message type:', (message as any).type);
    }
  }

  /**
   * Handle initialize message - set up diagram
   * Requirements: 3.1
   */
  private handleInitialize(data: DiagramData): void {
    console.log('Initialize message received with data:', data);
    this.setDiagramData(data);
    // Initialization is handled by the webview itself
    // This handler is for any extension-side initialization needed
  }

  /**
   * Handle element selected message - trigger file highlighting
   * Requirements: 3.1, 3.2, 3.3, 4.1, 4.4
   */
  private handleElementSelected(elementId: string): void {
    console.log('Element selected:', elementId);

    if (!elementId) {
      // Clear selection
      this.fileHighlighter.clearHighlights();
      if (this.callbacks.onElementSelected) {
        this.callbacks.onElementSelected('');
      }
      return;
    }

    // Get files for element from mapping service
    const files = this.fileMappingService.getFilesForElement(elementId);
    
    if (files.length > 0) {
      // Highlight associated files
      this.fileHighlighter.highlightFiles(files);
      console.log('Highlighted files:', files);
    } else {
      console.warn('No files found for element:', elementId);
      this.fileHighlighter.clearHighlights();
    }

    // Notify callback
    if (this.callbacks.onElementSelected) {
      this.callbacks.onElementSelected(elementId);
    }
  }

  /**
   * Handle element hovered message - for tooltip display
   * Requirements: 3.4
   */
  private handleElementHovered(elementId: string): void {
    console.log('Element hovered:', elementId);

    // Tooltip display is handled by the webview DiagramRenderer
    // This handler is for any extension-side hover effects needed

    // Notify callback
    if (this.callbacks.onElementHovered) {
      this.callbacks.onElementHovered(elementId);
    }
  }

  /**
   * Handle abstraction level changed message - filter diagram
   * Requirements: 6.5
   */
  private handleAbstractionLevelChanged(level: AbstractionLevel): void {
    console.log('Abstraction level changed:', level);

    // Update diagram with new abstraction level
    if (this.currentDiagramData) {
      const filteredData = this.filterDiagramByAbstractionLevel(
        this.currentDiagramData,
        level
      );
      this.webviewManager.updateDiagram(filteredData);
    }

    // Notify callback
    if (this.callbacks.onAbstractionLevelChanged) {
      this.callbacks.onAbstractionLevelChanged(level);
    }
  }

  /**
   * Handle export requested message - trigger export
   * Requirements: 7.1
   */
  private handleExportRequested(format: 'png' | 'svg'): void {
    console.log('Export requested:', format);

    // Notify callback to handle actual export
    if (this.callbacks.onExportRequested) {
      this.callbacks.onExportRequested(format);
    } else {
      console.warn('No export handler registered');
    }
  }

  /**
   * Handle refresh requested message - regenerate diagram
   * Requirements: 11.1, 11.4
   */
  private handleRefreshRequested(): void {
    console.log('Refresh requested');

    // Notify callback to regenerate diagram
    if (this.callbacks.onRefreshRequested) {
      this.callbacks.onRefreshRequested();
    } else {
      console.warn('No refresh handler registered');
    }
  }

  /**
   * Handle error message from webview
   */
  private handleError(message: string): void {
    console.error('Webview error:', message);
    // Could show error notification to user
  }

  /**
   * Handle file click - open file in editor
   * Requirements: 4.3
   */
  handleFileClick(filePath: string): void {
    console.log('File clicked:', filePath);

    // Notify callback to open file in editor
    if (this.callbacks.onFileClicked) {
      this.callbacks.onFileClicked(filePath);
    } else {
      console.warn('No file click handler registered');
    }
  }

  /**
   * Filter diagram data by abstraction level
   * Requirements: 6.2, 6.3, 6.4
   */
  private filterDiagramByAbstractionLevel(
    data: DiagramData,
    level: AbstractionLevel
  ): DiagramData {
    // Filter nodes by abstraction level
    const filteredNodes = data.nodes.filter(node => {
      // Include nodes at or below the selected abstraction level
      // Assuming nodes without abstractionLevel are at level 1 (Overview)
      const nodeLevel = (node as any).abstractionLevel || AbstractionLevel.Overview;
      return nodeLevel <= level;
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
   * Clear highlights when diagram is closed
   * Requirements: 4.5
   */
  clearHighlights(): void {
    this.fileHighlighter.clearHighlights();
  }

  /**
   * Dispose and clean up resources
   * Requirements: 4.5
   */
  dispose(): void {
    this.fileHighlighter.clearHighlights();
    this.fileMappingService.clear();
    this.currentDiagramData = null;
  }
}
