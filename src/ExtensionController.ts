/**
 * ExtensionController - Main orchestrator for extension lifecycle
 * Requirements: 8.1, 8.6, 5.5, 6.6, 11.4, 2.1, 3.1, 6.5, 11.1
 * 
 * Responsibilities:
 * - Orchestrate extension lifecycle (activate/deactivate)
 * - Register commands and event handlers
 * - Coordinate between components (AnalysisService, DiagramGenerator, WebviewManager, FileHighlighter)
 * - Manage state (analysis results, selection, abstraction level, zoom/pan)
 * - Handle configuration changes
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  AnalysisResult,
  DiagramData,
  AbstractionLevel,
  AnalysisConfig,
  Language,
  WebviewMessage
} from './types';
import { GroundingData, ArchitecturalModel } from './types/analysis';
import { AnalysisService, ProgressCallback, createCancellationToken } from './analysis/AnalysisService';
import { KiroAIService } from './analysis/KiroAIService';
import { DiagramGenerator } from './diagram/DiagramGenerator';
import { WebviewManager } from './ui/WebviewManager';
import { FileHighlighter } from './ui/FileHighlighter';
import { FileMappingService } from './ui/FileMappingService';
import { ErrorHandler, AnalysisError, AnalysisErrorType, RenderError, RenderErrorType } from './analysis/ErrorHandler';
import { FileWatcher, FileWatcherConfig, FileChangeEvent } from './analysis/FileWatcher';
import { MemoryManager } from './performance/MemoryManager';

// Kiro IDE API types (to be provided by Kiro runtime)
interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Thenable<void>;
}

interface ExtensionContext {
  subscriptions: any[];
  globalState: Memento;
  workspaceState: Memento;
}

interface Command {
  command: string;
  callback: (...args: any[]) => any;
}

/**
 * Extension state for preservation during navigation
 * Requirements: 5.5, 6.6, 11.4, 11.5
 */
interface ExtensionState {
  analysisResult: AnalysisResult | null;
  groundingData: GroundingData | null;
  architecturalModel: ArchitecturalModel | null;
  selectedElementId: string | null;
  abstractionLevel: AbstractionLevel;
  zoomLevel: number;
  panPosition: { x: number; y: number };
  isFirstActivation: boolean;
  isDiagramOutOfSync: boolean; // Requirement 11.5
  lastAnalysisTimestamp: number | null;
}

/**
 * Main extension controller
 */
export class ExtensionController {
  private context: ExtensionContext | null = null;
  private analysisService: AnalysisService;
  private aiService: KiroAIService;
  private diagramGenerator: DiagramGenerator;
  private webviewManager: WebviewManager;
  private fileHighlighter: FileHighlighter;
  private fileMappingService: FileMappingService;
  private fileWatcher: FileWatcher | null = null;
  private errorHandler: ErrorHandler | null = null;
  private memoryManager: MemoryManager;
  
  // State management (Requirements: 5.5, 6.6, 11.4, 11.5)
  private state: ExtensionState = {
    analysisResult: null,
    groundingData: null,
    architecturalModel: null,
    selectedElementId: null,
    abstractionLevel: AbstractionLevel.Module,
    zoomLevel: 1.0,
    panPosition: { x: 0, y: 0 },
    isFirstActivation: true,
    isDiagramOutOfSync: false,
    lastAnalysisTimestamp: null
  };

  constructor() {
    this.analysisService = new AnalysisService();
    this.aiService = new KiroAIService();
    this.diagramGenerator = new DiagramGenerator();
    this.webviewManager = new WebviewManager();
    this.fileHighlighter = new FileHighlighter();
    this.fileMappingService = new FileMappingService();
    this.memoryManager = new MemoryManager();
  }

  /**
   * Activate extension
   * Requirements: 8.1, 8.6
   */
  async activate(context: ExtensionContext): Promise<void> {
    this.context = context;

    // Initialize error handler
    // TODO: Use actual Kiro output channel and window API
    const outputChannel = {
      appendLine: (value: string) => console.log(value),
      show: () => console.log('Showing output channel')
    };
    const notifier = {
      showErrorMessage: async (message: string, ...items: string[]) => {
        console.error(message);
        return undefined;
      },
      showWarningMessage: async (message: string, ...items: string[]) => {
        console.warn(message);
        return undefined;
      }
    };
    this.errorHandler = new ErrorHandler(outputChannel, notifier);

    // Load persisted state
    await this.loadState();

    // Register commands
    this.registerCommands();

    // Register configuration change listener
    this.registerConfigurationListener();

    // Show welcome message on first activation (Requirement 8.6)
    if (this.state.isFirstActivation) {
      await this.showWelcomeMessage();
      this.state.isFirstActivation = false;
      await this.saveState();
    }

    // Initialize file watcher if auto-refresh is enabled (Requirements: 11.2, 11.3)
    await this.initializeFileWatcher();

    console.log('ArchView extension activated');
  }

  /**
   * Deactivate extension
   * Requirements: 8.1, 9.4
   */
  async deactivate(): Promise<void> {
    // Save state before deactivation
    await this.saveState();

    // Stop file watcher
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }

    // Clean up resources with memory release (Requirements: 9.4)
    await this.memoryManager.releaseMemory(async () => {
      this.webviewManager.disposeWebview();
      this.fileHighlighter.clearHighlights();
      this.analysisService.dispose();
      
      // Clear state to release memory
      this.state.groundingData = null;
      this.state.architecturalModel = null;
      this.state.analysisResult = null;
    });

    console.log('ArchView extension deactivated');
  }

  /**
   * Register extension commands
   * Requirements: 8.1
   */
  private registerCommands(): void {
    console.log('=== registerCommands called ===');
    
    // Test command to verify registration works
    const testDisposable = vscode.commands.registerCommand(
      'archview.test',
      () => {
        console.log('=== TEST COMMAND WORKS ===');
        vscode.window.showInformationMessage('ArchView test command works!');
      }
    );
    
    // Register generateDiagram
    const generateDisposable = vscode.commands.registerCommand(
      'archview.generateDiagram',
      async () => {
        console.log('=== archview.generateDiagram command triggered ===');
        vscode.window.showInformationMessage('Generate Diagram command triggered!');
        await this.generateDiagram();
      }
    );
    
    // Register refreshDiagram
    const refreshDisposable = vscode.commands.registerCommand(
      'archview.refreshDiagram',
      async () => {
        console.log('=== archview.refreshDiagram command triggered ===');
        await this.refreshDiagram();
      }
    );
    
    // Register exportDiagram
    const exportDisposable = vscode.commands.registerCommand(
      'archview.exportDiagram',
      async (format: 'png' | 'svg') => {
        console.log('=== archview.exportDiagram command triggered ===');
        await this.exportDiagram(format);
      }
    );

    if (this.context) {
      this.context.subscriptions.push(testDisposable);
      this.context.subscriptions.push(generateDisposable);
      this.context.subscriptions.push(refreshDisposable);
      this.context.subscriptions.push(exportDisposable);
    }
    
    console.log('Commands registered successfully');
    console.log('Try running: archview.test');
  }

  /**
   * Register configuration change listener
   * Requirements: 8.3, 8.4, 8.5
   */
  private registerConfigurationListener(): void {
    // TODO: Use actual Kiro configuration API
    // In production: vscode.workspace.onDidChangeConfiguration(e => {
    //   if (e.affectsConfiguration('archview')) {
    //     this.handleConfigurationChange();
    //   }
    // });
    console.log('Configuration listener registered');
  }

  /**
   * Handle configuration changes
   * Requirements: 8.3, 8.4, 8.5, 11.2, 11.3
   */
  private async handleConfigurationChange(): Promise<void> {
    // Invalidate cache when configuration changes
    this.analysisService.clearCache();
    
    // Reinitialize file watcher with new configuration
    await this.initializeFileWatcher();
    
    // If diagram is currently displayed, offer to refresh
    if (this.webviewManager.isActive()) {
      // TODO: Show notification to user
      console.log('Configuration changed - cache invalidated');
    }
  }

  /**
   * Initialize file watcher for auto-refresh
   * Requirements: 11.2, 11.3
   */
  private async initializeFileWatcher(): Promise<void> {
    const workspaceRoot = await this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    // Get configuration
    const config = this.getAnalysisConfig(workspaceRoot);
    
    // Stop existing watcher if any
    if (this.fileWatcher) {
      this.fileWatcher.stop();
    }

    // Create file watcher config
    const watcherConfig: FileWatcherConfig = {
      autoRefresh: config.autoRefresh ?? false,
      autoRefreshDebounce: config.autoRefreshDebounce ?? 10000, // Default: 10 seconds
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns
    };

    // Create and start file watcher
    this.fileWatcher = new FileWatcher(watcherConfig);
    this.fileWatcher.start(workspaceRoot, (event) => this.handleFileChanges(event));
  }

  /**
   * Handle file change events from file watcher
   * Requirements: 11.3, 11.4, 11.5
   */
  private async handleFileChanges(event: FileChangeEvent): Promise<void> {
    console.log(`Files changed: ${event.changedFiles.size} files`);

    // Mark diagram as out of sync (Requirement 11.5)
    this.state.isDiagramOutOfSync = true;

    // Show indicator in webview (Requirement 11.5)
    if (this.webviewManager.isActive()) {
      this.webviewManager.postMessage({
        type: 'diagramOutOfSync',
        timestamp: event.timestamp
      } as any);
    }

    // Get configuration to check if auto-refresh is enabled
    const workspaceRoot = await this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const config = this.getAnalysisConfig(workspaceRoot);
    
    // Trigger incremental refresh if auto-refresh enabled (Requirement 11.3)
    if (config.autoRefresh) {
      await this.performIncrementalRefresh(event.changedFiles);
    }
  }

  /**
   * Perform incremental refresh for changed files
   * Requirements: 11.3, 11.4, 11.5
   */
  private async performIncrementalRefresh(changedFiles: Set<string>): Promise<void> {
    try {
      console.log(`Performing incremental refresh for ${changedFiles.size} files`);

      // Preserve current state (Requirement 11.4)
      const previousState = {
        selectedElementId: this.state.selectedElementId,
        abstractionLevel: this.state.abstractionLevel,
        zoomLevel: this.state.zoomLevel,
        panPosition: this.state.panPosition
      };

      // Clear cache only for changed files (Requirement 11.5)
      for (const filePath of changedFiles) {
        this.analysisService.clearCacheForFile(filePath);
      }

      // Re-analyze (will use cache for unchanged files)
      await this.generateDiagram();

      // Restore preserved state (Requirement 11.4)
      this.state.selectedElementId = previousState.selectedElementId;
      this.state.abstractionLevel = previousState.abstractionLevel;
      this.state.zoomLevel = previousState.zoomLevel;
      this.state.panPosition = previousState.panPosition;

      // Reapply selection if element still exists
      if (this.state.selectedElementId && this.state.architecturalModel) {
        const elementExists = this.state.architecturalModel.components.some(
          c => c.id === this.state.selectedElementId
        );
        if (elementExists) {
          this.setSelectedElement(this.state.selectedElementId);
        } else {
          this.clearSelection();
        }
      }

      // Mark diagram as in sync
      this.state.isDiagramOutOfSync = false;

      // Notify webview
      if (this.webviewManager.isActive()) {
        this.webviewManager.postMessage({
          type: 'diagramRefreshed'
        } as any);
      }

      console.log('Incremental refresh completed successfully');
    } catch (error) {
      console.error('Incremental refresh failed:', error);
      // Keep diagram marked as out of sync on error
    }
  }

  /**
   * Generate diagram command
   * Requirements: 2.1, 3.1, 6.5, 11.1
   */
  async generateDiagram(): Promise<void> {
    console.log('=== generateDiagram called ===');
    try {
      // Get workspace root path
      console.log('Getting workspace root...');
      const rootPath = await this.getWorkspaceRoot();
      console.log('Workspace root:', rootPath);
      
      if (!rootPath) {
        console.error('No workspace root found');
        throw new AnalysisError(
          'No workspace folder open',
          'Please open a folder or workspace to analyze',
          AnalysisErrorType.NoFilesFound
        );
      }

      // Show progress indicator
      console.log('Generating architecture diagram...');

      // Get analysis configuration
      const config = this.getAnalysisConfig(rootPath);
      console.log('Analysis config:', config);

      // Phase 1: Build grounding layer (Requirements: 2.1)
      console.log('Phase 1: Building grounding layer...');
      const progressCallback: ProgressCallback = (percentage, message) => {
        console.log(`Progress: ${percentage}% - ${message}`);
      };

      const cancellationToken = createCancellationToken();
      
      this.state.groundingData = await this.analysisService.buildGroundingLayer(rootPath, {
        config,
        progressCallback,
        cancellationToken,
        timeoutMs: 120000
      });
      console.log('Grounding layer built, files:', this.state.groundingData?.files.length);

      // Phase 2: Interpret with AI (Requirements: 2.1, 2.2)
      console.log('Phase 2: Interpreting with AI...');
      if (config.aiEnabled) {
        this.state.architecturalModel = await this.aiService.interpretArchitecture(
          this.state.groundingData
        );
      } else {
        // Use fallback heuristic interpretation
        console.log('Using fallback heuristic model...');
        this.state.architecturalModel = await this.aiService.buildHeuristicModel(
          this.state.groundingData,
          0 // inferenceTimeMs for fallback
        );
      }
      console.log('Architectural model created, components:', this.state.architecturalModel?.components.length);

      // Phase 3: Generate diagram (Requirements: 2.1)
      console.log('Phase 3: Generating diagram...');
      if (!this.state.architecturalModel) {
        throw new AnalysisError(
          'Failed to generate architectural model',
          'Could not interpret codebase architecture',
          AnalysisErrorType.ParseError
        );
      }

      const diagramData = await this.diagramGenerator.generateDiagram(
        this.state.architecturalModel,
        this.state.abstractionLevel
      );
      console.log('Diagram data generated, nodes:', diagramData.nodes.length);

      // Phase 4: Display in webview (Requirements: 2.1)
      console.log('Phase 4: Creating webview...');
      this.webviewManager.createWebview();
      this.webviewManager.updateDiagram(diagramData);

      // Set up webview message handling (Requirements: 3.1, 6.5)
      this.setupWebviewMessageHandling();

      // Save state
      await this.saveState();

      console.log('=== Diagram generated successfully ===');
    } catch (error) {
      console.error('=== Error in generateDiagram ===', error);
      if (this.errorHandler && error instanceof AnalysisError) {
        this.errorHandler.handleAnalysisError(error);
      } else {
        console.error('Failed to generate diagram:', error);
        // Show error to user
        vscode.window.showErrorMessage(`Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Refresh diagram command
   * Requirements: 11.1, 11.4
   */
  async refreshDiagram(): Promise<void> {
    try {
      // Clear cache to force re-analysis
      this.analysisService.clearCache();

      // Preserve current state (Requirements: 11.4)
      const previousState = {
        selectedElementId: this.state.selectedElementId,
        abstractionLevel: this.state.abstractionLevel,
        zoomLevel: this.state.zoomLevel,
        panPosition: this.state.panPosition
      };

      // Regenerate diagram
      await this.generateDiagram();

      // Restore preserved state (Requirements: 11.4)
      this.state.selectedElementId = previousState.selectedElementId;
      this.state.abstractionLevel = previousState.abstractionLevel;
      this.state.zoomLevel = previousState.zoomLevel;
      this.state.panPosition = previousState.panPosition;

      // Reapply selection if element still exists
      if (this.state.selectedElementId && this.state.architecturalModel) {
        const elementExists = this.state.architecturalModel.components.some(
          c => c.id === this.state.selectedElementId
        );
        if (elementExists) {
          this.setSelectedElement(this.state.selectedElementId);
        } else {
          this.clearSelection();
        }
      }

      console.log('Diagram refreshed successfully');
    } catch (error) {
      if (this.errorHandler && error instanceof AnalysisError) {
        this.errorHandler.handleAnalysisError(error);
      } else {
        console.error('Failed to refresh diagram:', error);
      }
    }
  }

  /**
   * Export diagram command
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async exportDiagram(format: 'png' | 'svg'): Promise<void> {
    try {
      if (!this.webviewManager.isActive()) {
        throw new RenderError(
          'No diagram to export',
          'Please generate a diagram first',
          RenderErrorType.InvalidData
        );
      }

      // Send export request to webview
      this.webviewManager.postMessage({
        type: 'exportRequested',
        format
      });

      console.log(`Export requested: ${format}`);
    } catch (error) {
      if (this.errorHandler && error instanceof RenderError) {
        this.errorHandler.handleRenderError(error);
      } else {
        console.error('Failed to export diagram:', error);
      }
    }
  }

  /**
   * Set up webview message handling
   * Requirements: 3.1, 6.5, 11.1
   */
  private setupWebviewMessageHandling(): void {
    this.webviewManager.onMessage((message: WebviewMessage) => {
      switch (message.type) {
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
          this.exportDiagram(message.format);
          break;
        case 'refreshRequested':
          this.refreshDiagram();
          break;
      }
    });
  }

  /**
   * Handle element selection
   * Requirements: 3.1, 4.1
   */
  private handleElementSelected(elementId: string): void {
    this.setSelectedElement(elementId);
  }

  /**
   * Handle element hover
   * Requirements: 3.4
   */
  private handleElementHovered(elementId: string): void {
    // TODO: Show tooltip with element information
    console.log(`Element hovered: ${elementId}`);
  }

  /**
   * Handle abstraction level change
   * Requirements: 6.5, 6.6
   */
  private async handleAbstractionLevelChanged(level: AbstractionLevel): Promise<void> {
    this.state.abstractionLevel = level;

    // Regenerate diagram with new abstraction level
    if (this.state.architecturalModel) {
      const diagramData = await this.diagramGenerator.generateDiagram(
        this.state.architecturalModel,
        level
      );
      this.webviewManager.updateDiagram(diagramData);
    }

    await this.saveState();
  }

  /**
   * Get analysis results
   * Requirements: 5.5, 6.6, 11.4
   */
  getAnalysisResults(): AnalysisResult | null {
    return this.state.analysisResult;
  }

  /**
   * Set selected element
   * Requirements: 3.1, 4.1
   */
  setSelectedElement(elementId: string): void {
    this.state.selectedElementId = elementId;

    // Get file paths for selected element
    if (this.state.architecturalModel) {
      const component = this.state.architecturalModel.components.find(
        c => c.id === elementId
      );
      
      if (component) {
        // Highlight files in IDE (Requirements: 4.1)
        this.fileHighlighter.highlightFiles(component.filePaths);
      }
    }
  }

  /**
   * Clear selection
   * Requirements: 3.5, 4.5
   */
  clearSelection(): void {
    this.state.selectedElementId = null;
    this.fileHighlighter.clearHighlights();
  }

  /**
   * Get workspace root path
   */
  private async getWorkspaceRoot(): Promise<string | null> {
    // TODO: Use actual Kiro workspace API
    // In production: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    return process.cwd();
  }

  /**
   * Get current state (for testing purposes)
   * @internal
   */
  getState(): Readonly<ExtensionState> {
    return { ...this.state };
  }

  /**
   * Set state (for testing purposes)
   * @internal
   */
  setState(partialState: Partial<ExtensionState>): void {
    this.state = { ...this.state, ...partialState };
  }

  /**
   * Get analysis configuration
   * Requirements: 8.3, 8.4, 8.5
   */
  private getAnalysisConfig(rootPath: string): AnalysisConfig {
    // TODO: Read from Kiro configuration API
    // In production: const config = vscode.workspace.getConfiguration('archview')
    
    // For now, use defaults from package.json
    const config = {
      includePatterns: ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.go'],
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/__pycache__/**',
        '**/venv/**',
        '**/.venv/**',
        '**/target/**',
        '**/.idea/**',
        '**/.vscode/**'
      ],
      maxFiles: 1000,
      maxDepth: 10,
      languages: ['typescript', 'javascript', 'python', 'java', 'go'],
      aiEnabled: true,
      autoRefresh: false,
      autoRefreshDebounce: 10000
    };

    return {
      rootPath,
      includePatterns: config.includePatterns,
      excludePatterns: config.excludePatterns,
      maxFiles: config.maxFiles,
      maxDepth: config.maxDepth,
      languages: this.mapLanguageStrings(config.languages),
      aiEnabled: config.aiEnabled,
      autoRefresh: config.autoRefresh,
      autoRefreshDebounce: config.autoRefreshDebounce
    };
  }

  /**
   * Map language strings to Language enum
   */
  private mapLanguageStrings(languages: string[]): Language[] {
    const languageMap: Record<string, Language> = {
      'typescript': Language.TypeScript,
      'javascript': Language.JavaScript,
      'python': Language.Python,
      'java': Language.Java,
      'go': Language.Go
    };

    return languages
      .map(lang => languageMap[lang.toLowerCase()])
      .filter(lang => lang !== undefined);
  }

  /**
   * Show welcome message
   * Requirements: 8.6
   */
  private async showWelcomeMessage(): Promise<void> {
    // TODO: Use actual Kiro notification API
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  Welcome to ArchView - AI Architecture Diagrams           ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Get started:                                              ║
║  1. Open a project folder                                  ║
║  2. Run command: "ArchView: Generate Diagram"              ║
║  3. Explore your architecture visually!                    ║
║                                                            ║
║  Features:                                                 ║
║  • AI-powered architecture analysis                        ║
║  • Interactive diagram navigation                          ║
║  • Multi-language support                                  ║
║  • Export to PNG/SVG                                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Load persisted state
   * Requirements: 5.5, 6.6, 11.4
   */
  private async loadState(): Promise<void> {
    if (!this.context) return;

    try {
      const savedState = this.context.globalState.get<Partial<ExtensionState>>('archview.state');
      
      if (savedState) {
        this.state = { ...this.state, ...savedState };
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Save persisted state
   * Requirements: 5.5, 6.6, 11.4
   */
  private async saveState(): Promise<void> {
    if (!this.context) return;

    try {
      await this.context.globalState.update('archview.state', this.state);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }
}
