/**
 * WebviewManager - Runs in extension host context (Node.js)
 * Manages webview lifecycle and bidirectional messaging
 * Requirements: 2.1, 6.5
 */

import { DiagramData, WebviewMessage, AbstractionLevel } from '../types';

// Kiro webview API types (to be provided by Kiro runtime)
interface Webview {
  postMessage(message: WebviewMessage): Promise<boolean>;
  onDidReceiveMessage(handler: (message: WebviewMessage) => void): void;
  dispose(): void;
}

interface WebviewPanel {
  webview: Webview;
  dispose(): void;
  reveal(): void;
  onDidDispose(handler: () => void): void;
}

/**
 * WebviewManager handles webview lifecycle and communication
 */
export class WebviewManager {
  private panel: WebviewPanel | null = null;
  private messageHandlers: Map<string, (message: WebviewMessage) => void> = new Map();
  private isDisposed = false;

  /**
   * Create and initialize webview panel
   * Requirements: 2.1
   */
  createWebview(): WebviewPanel {
    if (this.panel) {
      // Reuse existing panel
      this.panel.reveal();
      return this.panel;
    }

    // TODO: Use actual Kiro webview API when available
    // For now, create a mock structure
    this.panel = this.createWebviewPanel();
    this.isDisposed = false;

    // Set up message handling
    this.setupMessageHandling();

    // Set up disposal handling
    this.panel.onDidDispose(() => {
      this.handleDisposal();
    });

    return this.panel;
  }

  /**
   * Dispose webview and clean up resources
   * Requirements: 2.1
   */
  disposeWebview(): void {
    if (this.panel) {
      this.panel.dispose();
      this.handleDisposal();
    }
  }

  /**
   * Send message to webview
   * Requirements: 6.5
   */
  postMessage(message: WebviewMessage): void {
    if (!this.panel || this.isDisposed) {
      console.warn('Cannot post message: webview not available');
      return;
    }

    this.panel.webview.postMessage(message);
  }

  /**
   * Register message handler
   * Requirements: 6.5
   */
  onMessage(handler: (message: WebviewMessage) => void): void {
    const handlerId = `handler_${Date.now()}_${Math.random()}`;
    this.messageHandlers.set(handlerId, handler);
  }

  /**
   * Update diagram data in webview
   * Requirements: 2.1
   */
  updateDiagram(data: DiagramData): void {
    this.postMessage({
      type: 'initialize',
      data
    });
  }

  /**
   * Set abstraction level in webview
   * Requirements: 6.5
   */
  setAbstractionLevel(level: AbstractionLevel): void {
    this.postMessage({
      type: 'abstractionLevelChanged',
      level
    });
  }

  /**
   * Send error message to webview
   */
  showError(message: string): void {
    this.postMessage({
      type: 'error',
      message
    });
  }

  /**
   * Check if webview is active
   */
  isActive(): boolean {
    return this.panel !== null && !this.isDisposed;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create webview panel using Kiro API
   */
  private createWebviewPanel(): WebviewPanel {
    // TODO: Replace with actual Kiro webview API
    // This is a placeholder structure
    const mockWebview: Webview = {
      postMessage: async (message: WebviewMessage) => {
        console.log('Mock postMessage:', message);
        return true;
      },
      onDidReceiveMessage: (handler: (message: WebviewMessage) => void) => {
        // Store handler for mock implementation
      },
      dispose: () => {
        // Cleanup
      }
    };

    const mockPanel: WebviewPanel = {
      webview: mockWebview,
      dispose: () => {
        mockWebview.dispose();
      },
      reveal: () => {
        console.log('Mock reveal webview');
      },
      onDidDispose: (handler: () => void) => {
        // Store disposal handler
      }
    };

    return mockPanel;
  }

  /**
   * Set up message handling from webview
   */
  private setupMessageHandling(): void {
    if (!this.panel) return;

    this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
      // Notify all registered handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    });
  }

  /**
   * Handle webview disposal
   */
  private handleDisposal(): void {
    this.isDisposed = true;
    this.panel = null;
    this.messageHandlers.clear();
  }

  /**
   * Get webview HTML content
   * Note: In production, this would load from the webview bundle
   * For now, returns inline HTML with embedded styles and script
   */
  getWebviewContent(): string {
    // TODO: Load from bundled webview assets (index.html, styles.css, webview.js)
    // For now, return inline HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Architecture Diagram</title>
  <style>
    ${this.getInlineStyles()}
  </style>
</head>
<body>
  <div id="diagram-container"></div>
  <div id="controls">
    <div class="control-group">
      <label>Zoom</label>
      <button id="zoom-in" title="Zoom In">+</button>
      <button id="zoom-out" title="Zoom Out">-</button>
      <button id="fit-view" title="Fit to View">Fit</button>
    </div>
    <div class="control-group">
      <label>Abstraction Level</label>
      <select id="abstraction-level">
        <option value="1">Overview</option>
        <option value="2" selected>Module</option>
        <option value="3">Detailed</option>
      </select>
    </div>
    <div class="control-group">
      <label>Export</label>
      <button id="export-png" title="Export as PNG">PNG</button>
      <button id="export-svg" title="Export as SVG">SVG</button>
    </div>
    <div class="control-group">
      <button id="refresh" title="Refresh Diagram">Refresh</button>
    </div>
  </div>
  <div id="loading" style="display: none;">
    <div class="spinner"></div>
    <p>Loading diagram...</p>
  </div>
  <div id="error" style="display: none;">
    <p class="error-message"></p>
  </div>
  <script>
    ${this.getInlineScript()}
  </script>
</body>
</html>`;
  }

  /**
   * Get inline styles for webview
   */
  private getInlineStyles(): string {
    // Inline version of styles.css
    return `
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background-color: #f5f5f5;
      }
      #diagram-container {
        width: 100vw;
        height: 100vh;
        position: relative;
        background-color: #ffffff;
      }
      #controls {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.98);
        padding: 12px;
        border-radius: 6px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        min-width: 160px;
      }
      .control-group {
        margin-bottom: 12px;
      }
      .control-group:last-child {
        margin-bottom: 0;
      }
      label {
        display: block;
        font-size: 11px;
        color: #666;
        margin-bottom: 6px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      button {
        padding: 8px 14px;
        margin: 2px;
        border: 1px solid #d0d0d0;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: #333;
        transition: all 0.15s ease;
      }
      button:hover {
        background: #f8f8f8;
        border-color: #b0b0b0;
      }
      button:active {
        background: #e8e8e8;
        transform: translateY(1px);
      }
      #zoom-in, #zoom-out {
        width: 36px;
        padding: 8px;
        font-size: 16px;
        font-weight: bold;
      }
      #fit-view {
        width: 50px;
      }
      select {
        width: 100%;
        padding: 8px;
        border: 1px solid #d0d0d0;
        border-radius: 4px;
        font-size: 13px;
        background: white;
        cursor: pointer;
      }
      #export-png, #export-svg {
        width: calc(50% - 4px);
        font-size: 12px;
      }
      #refresh {
        width: 100%;
        background: #0066cc;
        color: white;
        border-color: #0066cc;
      }
      #refresh:hover {
        background: #0052a3;
      }
      #loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 2000;
        background: rgba(255, 255, 255, 0.95);
        padding: 30px 40px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 16px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 2000;
        background: #fff;
        padding: 30px 40px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        border-left: 4px solid #dc3545;
        max-width: 500px;
      }
      .error-message {
        margin: 0;
        color: #dc3545;
        font-size: 14px;
      }
      .diagram-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 10px 14px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 250px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    `;
  }

  /**
   * Get inline script for webview
   */
  private getInlineScript(): string {
    // Inline version of webview.js
    // This is a simplified version - full implementation would be bundled
    return `
      (function() {
        const vscode = acquireVsCodeApi();
        let currentDiagramData = null;
        
        function initialize() {
          document.getElementById('zoom-in').addEventListener('click', () => {
            console.log('Zoom in');
          });
          document.getElementById('zoom-out').addEventListener('click', () => {
            console.log('Zoom out');
          });
          document.getElementById('fit-view').addEventListener('click', () => {
            console.log('Fit view');
          });
          document.getElementById('abstraction-level').addEventListener('change', (e) => {
            vscode.postMessage({ type: 'abstractionLevelChanged', level: parseInt(e.target.value) });
          });
          document.getElementById('export-png').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportRequested', format: 'png' });
          });
          document.getElementById('export-svg').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportRequested', format: 'svg' });
          });
          document.getElementById('refresh').addEventListener('click', () => {
            vscode.postMessage({ type: 'refreshRequested' });
          });
          
          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'initialize') {
              currentDiagramData = message.data;
              document.getElementById('loading').style.display = 'none';
              console.log('Diagram initialized:', message.data);
            } else if (message.type === 'error') {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.querySelector('.error-message').textContent = message.message;
            }
          });
          
          vscode.postMessage({ type: 'ready' });
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initialize);
        } else {
          initialize();
        }
      })();
    `;
  }
}
