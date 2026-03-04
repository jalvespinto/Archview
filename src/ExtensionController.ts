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

import * as vscode from 'vscode';
import {
  AnalysisResult,
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
  update(key: string, value: unknown): Thenable<void>;
}

interface ExtensionContext {
  subscriptions: vscode.Disposable[];
  globalState: Memento;
  workspaceState: Memento;
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
  private webviewMessageSubscription: { dispose: () => void } | null = null;
  
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
    const outputChannel = { appendLine: (_value: string) => {}, show: () => {} };
    const notifier = {
      showErrorMessage: async (_message: string, ..._items: string[]) => undefined,
      showWarningMessage: async (_message: string, ..._items: string[]) => undefined
    };
    this.errorHandler = new ErrorHandler(outputChannel, notifier);
    await this.loadState();
    this.registerCommands();
    this.registerConfigurationListener();
    if (this.state.isFirstActivation) {
      await this.showWelcomeMessage();
      this.state.isFirstActivation = false;
      await this.saveState();
    }
    await this.initializeFileWatcher();
  }

  /**
   * Deactivate extension
   * Requirements: 8.1, 9.4
   */
  async deactivate(): Promise<void> {
    await this.saveState();
    if (this.fileWatcher) this.fileWatcher.stop();
    this.webviewMessageSubscription?.dispose();
    this.webviewMessageSubscription = null;
    await this.memoryManager.releaseMemory(async () => {
      this.webviewManager.disposeWebview();
      this.fileHighlighter.clearHighlights();
      this.analysisService.dispose();
      this.state.groundingData = null;
      this.state.architecturalModel = null;
      this.state.analysisResult = null;
    });
  }

  /**
   * Register extension commands
   * Requirements: 8.1
   */
  private registerCommands(): void {
    const generateDisposable = vscode.commands.registerCommand('archview.generateDiagram', async () => this.generateDiagram());
    const refreshDisposable = vscode.commands.registerCommand('archview.refreshDiagram', async () => this.refreshDiagram());
    const exportDisposable = vscode.commands.registerCommand('archview.exportDiagram', async (format: unknown) => {
      const exportFormat = this.normalizeExportFormat(format);
      if (!exportFormat) {
        vscode.window.showErrorMessage('Invalid export format. Use "png" or "svg".');
        return;
      }
      await this.exportDiagram(exportFormat);
    });
    if (this.context) this.context.subscriptions.push(generateDisposable, refreshDisposable, exportDisposable);
  }

  /**
   * Register configuration change listener
   * Requirements: 8.3, 8.4, 8.5
   */
  private registerConfigurationListener(): void {
    if (!this.context) return;
    this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('archview')) this.handleConfigurationChange();
    }));
  }

  /**
   * Handle configuration changes
   * Requirements: 8.3, 8.4, 8.5, 11.2, 11.3
   */
  private async handleConfigurationChange(): Promise<void> {
    this.analysisService.clearCache();
    await this.initializeFileWatcher();
    if (this.webviewManager.isActive()) { /* TODO: Show notification to user */ }
  }

  /**
   * Initialize file watcher for auto-refresh
   * Requirements: 11.2, 11.3
   */
  private async initializeFileWatcher(): Promise<void> {
    const workspaceRoot = await this.getWorkspaceRoot();
    if (!workspaceRoot) return;
    const config = this.getAnalysisConfig(workspaceRoot);
    if (this.fileWatcher) this.fileWatcher.stop();
    const watcherConfig: FileWatcherConfig = { autoRefresh: config.autoRefresh ?? false, autoRefreshDebounce: config.autoRefreshDebounce ?? 10000, includePatterns: config.includePatterns, excludePatterns: config.excludePatterns };
    this.fileWatcher = new FileWatcher(watcherConfig);
    this.fileWatcher.start(workspaceRoot, (event) => this.handleFileChanges(event));
  }

  /**
   * Handle file change events from file watcher
   * Requirements: 11.3, 11.4, 11.5
   */
  private async handleFileChanges(event: FileChangeEvent): Promise<void> {
    this.state.isDiagramOutOfSync = true;
    if (this.webviewManager.isActive()) this.webviewManager.postMessage({ type: 'diagramOutOfSync', timestamp: event.timestamp });
    const workspaceRoot = await this.getWorkspaceRoot();
    if (!workspaceRoot) return;
    const config = this.getAnalysisConfig(workspaceRoot);
    if (config.autoRefresh) await this.performIncrementalRefresh(event.changedFiles);
  }

  /**
   * Perform incremental refresh for changed files
   * Requirements: 11.3, 11.4, 11.5
   */
  private async performIncrementalRefresh(changedFiles: Set<string>): Promise<void> {
    try {
      const previousState = { selectedElementId: this.state.selectedElementId, abstractionLevel: this.state.abstractionLevel, zoomLevel: this.state.zoomLevel, panPosition: this.state.panPosition };
      for (const filePath of changedFiles) this.analysisService.clearCacheForFile(filePath);
      await this.generateDiagram();
      this.state.selectedElementId = previousState.selectedElementId;
      this.state.abstractionLevel = previousState.abstractionLevel;
      this.state.zoomLevel = previousState.zoomLevel;
      this.state.panPosition = previousState.panPosition;
      if (this.state.selectedElementId && this.state.architecturalModel) {
        const elementExists = this.state.architecturalModel.components.some((c) => c.id === this.state.selectedElementId);
        if (elementExists) this.setSelectedElement(this.state.selectedElementId);
        else this.clearSelection();
      }
      this.state.isDiagramOutOfSync = false;
      if (this.webviewManager.isActive()) this.webviewManager.postMessage({ type: 'diagramRefreshed' });
    } catch (error) {
      vscode.window.showErrorMessage(`Incremental refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate diagram command
   * Requirements: 2.1, 3.1, 6.5, 11.1
   */
  async generateDiagram(): Promise<void> {
    try {
      const rootPath = await this.getWorkspaceRoot();
      if (!rootPath) throw new AnalysisError('No workspace folder open', 'Please open a folder or workspace to analyze', AnalysisErrorType.NoFilesFound);
      const config = this.getAnalysisConfig(rootPath);
      const progressCallback: ProgressCallback = (_percentage, _message) => { /* Progress tracking */ };
      this.state.groundingData = await this.analysisService.buildGroundingLayer(rootPath, { config, progressCallback, cancellationToken: createCancellationToken(), timeoutMs: 120000 });
      this.state.architecturalModel = config.aiEnabled ? await this.aiService.interpretArchitecture(this.state.groundingData) : await this.aiService.buildHeuristicModel(this.state.groundingData, 0);
      if (!this.state.architecturalModel) throw new AnalysisError('Failed to generate architectural model', 'Could not interpret codebase architecture', AnalysisErrorType.ParseError);
      const diagramData = await this.diagramGenerator.generateDiagram(this.state.architecturalModel, this.state.abstractionLevel);
      this.webviewManager.createWebview(); this.webviewManager.updateDiagram(diagramData); this.setupWebviewMessageHandling();
      await this.saveState();
    } catch (error) {
      if (this.errorHandler && error instanceof AnalysisError) this.errorHandler.handleAnalysisError(error);
      else vscode.window.showErrorMessage(`Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh diagram command
   * Requirements: 11.1, 11.4
   */
  async refreshDiagram(): Promise<void> {
    try {
      this.analysisService.clearCache();
      const previousState = { selectedElementId: this.state.selectedElementId, abstractionLevel: this.state.abstractionLevel, zoomLevel: this.state.zoomLevel, panPosition: this.state.panPosition };
      await this.generateDiagram();
      this.state.selectedElementId = previousState.selectedElementId;
      this.state.abstractionLevel = previousState.abstractionLevel;
      this.state.zoomLevel = previousState.zoomLevel;
      this.state.panPosition = previousState.panPosition;
      if (this.state.selectedElementId && this.state.architecturalModel) {
        const elementExists = this.state.architecturalModel.components.some((c) => c.id === this.state.selectedElementId);
        if (elementExists) this.setSelectedElement(this.state.selectedElementId);
        else this.clearSelection();
      }
    } catch (error) {
      if (this.errorHandler && error instanceof AnalysisError) this.errorHandler.handleAnalysisError(error);
      else vscode.window.showErrorMessage(`Failed to refresh diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export diagram command
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async exportDiagram(format: 'png' | 'svg'): Promise<void> {
    try {
      if (!this.normalizeExportFormat(format)) throw new RenderError('Invalid export format', 'Supported formats are png and svg', RenderErrorType.InvalidData);
      if (!this.webviewManager.isActive()) throw new RenderError('No diagram to export', 'Please generate a diagram first', RenderErrorType.InvalidData);
      this.webviewManager.postMessage({ type: 'exportRequested', format });
    } catch (error) {
      if (this.errorHandler && error instanceof RenderError) this.errorHandler.handleRenderError(error);
      else vscode.window.showErrorMessage(`Failed to export diagram: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set up webview message handling
   * Requirements: 3.1, 6.5, 11.1
   */
  private setupWebviewMessageHandling(): void {
    this.webviewMessageSubscription?.dispose();
    this.webviewMessageSubscription = this.webviewManager.onMessage((message: WebviewMessage) => {
      switch (message.type) {
        case 'elementSelected':
          return void this.setSelectedElement(message.elementId);
        case 'elementHovered':
          return;
        case 'abstractionLevelChanged':
          return void this.handleAbstractionLevelChanged(message.level);
        case 'exportRequested': {
          const exportFormat = this.normalizeExportFormat(message.format);
          if (!exportFormat) {
            vscode.window.showErrorMessage('Invalid export format. Use "png" or "svg".');
            return;
          }
          return void this.exportDiagram(exportFormat);
        }
        case 'refreshRequested':
          return void this.refreshDiagram();
      }
    });
  }

  private normalizeExportFormat(format: unknown): 'png' | 'svg' | null {
    if (typeof format !== 'string') return null;
    const normalized = format.trim().toLowerCase();
    return normalized === 'png' || normalized === 'svg' ? normalized : null;
  }

  /**
   * Handle abstraction level change
   * Requirements: 6.5, 6.6
   */
  private async handleAbstractionLevelChanged(level: AbstractionLevel): Promise<void> {
    this.state.abstractionLevel = level;
    if (this.state.architecturalModel) {
      const diagramData = await this.diagramGenerator.generateDiagram(this.state.architecturalModel, level); this.webviewManager.updateDiagram(diagramData);
    }
    await this.saveState();
  }

  /**
   * Get analysis results
   * Requirements: 5.5, 6.6, 11.4
   */
  getAnalysisResults(): AnalysisResult | null { return this.state.analysisResult; }

  /**
   * Set selected element
   * Requirements: 3.1, 4.1
   */
  setSelectedElement(elementId: string): void {
    this.state.selectedElementId = elementId;
    if (this.state.architecturalModel) {
      const component = this.state.architecturalModel.components.find((c) => c.id === elementId);
      if (component) this.fileHighlighter.highlightFiles(component.filePaths);
    }
  }

  /**
   * Clear selection
   * Requirements: 3.5, 4.5
   */
  clearSelection(): void { this.state.selectedElementId = null; this.fileHighlighter.clearHighlights(); }

  /**
   * Get current state (for testing purposes)
   * @internal
   */
  getState(): Readonly<ExtensionState> { return { ...this.state }; }

  /**
   * Set state (for testing purposes)
   * @internal
   */
  setState(partialState: Partial<ExtensionState>): void { this.state = { ...this.state, ...partialState }; }

  /**
   * Get analysis configuration
   * Requirements: 8.3, 8.4, 8.5
   */
  private getAnalysisConfig(rootPath: string): AnalysisConfig {
    const config = vscode.workspace.getConfiguration('archview');
    return {
      rootPath,
      includePatterns: config.get<string[]>('includePatterns', ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.go']),
      excludePatterns: config.get<string[]>('excludePatterns', ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/__pycache__/**', '**/venv/**', '**/.venv/**', '**/target/**', '**/.idea/**', '**/.vscode/**']),
      maxFiles: config.get<number>('maxFiles', 1000),
      maxDepth: config.get<number>('maxDepth', 10),
      languages: this.mapLanguageStrings(config.get<string[]>('languages', ['typescript', 'javascript', 'python', 'java', 'go'])),
      aiEnabled: config.get<boolean>('aiEnabled', true),
      autoRefresh: config.get<boolean>('autoRefresh', false),
      autoRefreshDebounce: config.get<number>('autoRefreshDebounce', 10000)
    };
  }

  /**
   * Map language strings to Language enum
   */
  private mapLanguageStrings(languages: string[]): Language[] {
    const languageMap: Record<string, Language> = {
      typescript: Language.TypeScript,
      javascript: Language.JavaScript,
      python: Language.Python,
      java: Language.Java,
      go: Language.Go
    };
    return languages.map((lang) => languageMap[lang.toLowerCase()]).filter((lang) => lang !== undefined);
  }

  /**
   * Show welcome message
   * Requirements: 8.6
   */
  private async showWelcomeMessage(): Promise<void> { /* TODO: Use actual Kiro notification API */ }

  /**
   * Load persisted state
   * Requirements: 5.5, 6.6, 11.4
   */
  private async loadState(): Promise<void> {
    if (!this.context) return;
    try {
      const savedState = this.context.globalState.get<Partial<ExtensionState>>('archview.state');
      if (savedState) this.state = { ...this.state, ...savedState };
    } catch (_error) { void _error; }
  }

  /**
   * Save persisted state
   * Requirements: 5.5, 6.6, 11.4
   */
  private async saveState(): Promise<void> {
    if (!this.context) return;
    try {
      await this.context.globalState.update('archview.state', this.state);
    } catch (_error) { void _error; }
  }

  /**
   * Get workspace root path
   */
  private async getWorkspaceRoot(): Promise<string | null> { return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd(); }
}
