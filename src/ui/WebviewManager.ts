/**
 * WebviewManager - Runs in extension host context (Node.js)
 * Manages webview lifecycle and bidirectional messaging
 * Requirements: 2.1, 6.5
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { DiagramData, WebviewMessage, AbstractionLevel } from '../types';
import { webviewInlineScript } from './webviewInlineScript';
import { webviewFeedbackStyles, webviewTooltipStyles } from './webviewStyles';

/**
 * WebviewManager handles webview lifecycle and communication
 */
export class WebviewManager {
  private panel: vscode.WebviewPanel | undefined;
  private messageHandlers: Map<string, (message: WebviewMessage) => void> = new Map();
  private isDisposed = false;
  private messageListenerDisposable: vscode.Disposable | undefined;

  /**
   * Create and initialize webview panel
   * Requirements: 2.1
   */
  createWebview(): vscode.WebviewPanel {
    if (this.panel) {
      // Reuse existing panel
      this.panel.reveal();
      return this.panel;
    }

    // Create webview panel using Kiro/VS Code API
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
  onMessage(handler: (message: WebviewMessage) => void): { dispose: () => void } {
    const handlerId = `handler_${Date.now()}_${Math.random()}`;
    this.messageHandlers.set(handlerId, handler);
    return { dispose: () => this.messageHandlers.delete(handlerId) };
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
    return this.panel !== undefined && !this.isDisposed;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Dispose message listener
    this.messageListenerDisposable?.dispose();
    this.messageListenerDisposable = undefined;

    // Clear message handlers
    this.messageHandlers.clear();

    // Dispose panel if active
    if (this.panel) {
      this.panel.dispose();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create webview panel using Kiro/VS Code API
   */
  private createWebviewPanel(): vscode.WebviewPanel {
    // Create webview panel using Kiro/VS Code API
    // ViewColumn.One = 1 (show in first editor column)
    const panel = vscode.window.createWebviewPanel(
      'archview',                    // Identifies the type of webview
      'Architecture Diagram',        // Title shown in panel
      vscode.ViewColumn.One,         // Show in first editor column
      {
        enableScripts: true,         // Enable JavaScript in webview
        retainContextWhenHidden: true // Keep webview state when hidden
      }
    );

    // Set webview HTML content
    panel.webview.html = this.getWebviewContent();

    return panel;
  }

  /**
   * Set up message handling from webview
   */
  private setupMessageHandling(): void {
    if (!this.panel) return;

    // Dispose existing listener before creating a new one
    this.messageListenerDisposable?.dispose();

    // Store the disposable for cleanup
    this.messageListenerDisposable = this.panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
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
    this.panel = undefined;
    this.messageHandlers.clear();
    this.messageListenerDisposable?.dispose();
    this.messageListenerDisposable = undefined;
  }

  /**
   * Get webview HTML content
   * Note: In production, this would load from the webview bundle
   * For now, returns inline HTML with embedded styles and script
   */
  getWebviewContent(): string {
    const nonce = this.generateNonce();

    // TODO: Load from bundled webview assets (index.html, styles.css, webview.js)
    // For now, return inline HTML
    return `<!DOCTYPE html>
  <html lang="en">
  ${this.getWebviewHead(nonce)}
  <body>
    <div id="diagram-container"></div>
    ${this.getWebviewControls()}
    ${this.getWebviewStatusOverlays()}
    <script nonce="${nonce}">
      ${this.getInlineScript()}
    </script>
  </body>
  </html>`;
  }

  private getWebviewHead(nonce: string): string {
    return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>Architecture Diagram</title>
    <style nonce="${nonce}">
      ${this.getInlineStyles()}
    </style>
  </head>`;
  }

  private getWebviewControls(): string {
    return `<div id="controls">
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
    </div>`;
  }

  private getWebviewStatusOverlays(): string {
    return `<div id="loading" style="display: none;">
      <div class="spinner"></div>
      <p>Loading diagram...</p>
    </div>
    <div id="error" style="display: none;">
      <p class="error-message"></p>
    </div>`;
  }
  /**
   * Generate a cryptographically secure nonce for CSP
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Get inline styles for webview
   */
  private getInlineStyles(): string {
    // Inline version of styles.css
    return [
      this.getLayoutStyles(),
      this.getControlStyles(),
      this.getFeedbackStyles(),
      this.getTooltipStyles()
    ].join('\n');
  }

  private getLayoutStyles(): string {
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
    `;
  }

  private getControlStyles(): string {
    return [this.getControlGroupStyles(), this.getControlInputStyles()].join('\n');
  }

  private getControlGroupStyles(): string {
    return `
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
    `;
  }

  private getControlInputStyles(): string {
    return `
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
    `;
  }

  private getFeedbackStyles(): string {
    return webviewFeedbackStyles;
  }

  private getTooltipStyles(): string {
    return webviewTooltipStyles;
  }

  /**
   * Get inline script for webview
   */
  private getInlineScript(): string {
    return webviewInlineScript;
  }
}
