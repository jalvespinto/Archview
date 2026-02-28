/**
 * FileWatcher - Detects file changes and triggers diagram refresh
 * Requirements: 11.2, 11.3
 * 
 * Responsibilities:
 * - Use Kiro file system watcher API to detect file changes
 * - Debounce changes using configurable autoRefreshDebounce setting
 * - Track which files have changed since last analysis
 * - Respect autoRefresh configuration setting
 */

export interface FileWatcherConfig {
  autoRefresh: boolean;
  autoRefreshDebounce: number; // milliseconds, default: 10000 (10 seconds)
  includePatterns: string[];
  excludePatterns: string[];
}

export interface FileChangeEvent {
  changedFiles: Set<string>;
  timestamp: number;
}

export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * FileWatcher service for detecting file changes
 */
export class FileWatcher {
  private watchers: any[] = [];
  private changedFiles: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private config: FileWatcherConfig;
  private callback: FileChangeCallback | null = null;
  private isWatching: boolean = false;

  constructor(config: FileWatcherConfig) {
    this.config = config;
  }

  /**
   * Start watching for file changes
   * Requirements: 11.2
   */
  start(workspaceRoot: string, callback: FileChangeCallback): void {
    if (this.isWatching) {
      return;
    }

    if (!this.config.autoRefresh) {
      return;
    }

    this.callback = callback;
    this.isWatching = true;

    // Create file system watchers for each include pattern
    // In a real implementation, this would use Kiro's workspace.createFileSystemWatcher
    // For now, we'll create a mock structure that can be replaced with actual API
    this.setupWatchers(workspaceRoot);
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (!this.isWatching) {
      return;
    }

    // Dispose all watchers
    for (const watcher of this.watchers) {
      if (watcher && typeof watcher.dispose === 'function') {
        watcher.dispose();
      }
    }

    this.watchers = [];
    this.isWatching = false;
    this.clearDebounceTimer();
    this.changedFiles.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FileWatcherConfig>): void {
    const wasWatching = this.isWatching;
    const workspaceRoot = this.getCurrentWorkspaceRoot();

    if (wasWatching) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasWatching && workspaceRoot && this.callback) {
      this.start(workspaceRoot, this.callback);
    }
  }

  /**
   * Get the set of files that have changed since last notification
   */
  getChangedFiles(): Set<string> {
    return new Set(this.changedFiles);
  }

  /**
   * Clear the changed files set
   */
  clearChangedFiles(): void {
    this.changedFiles.clear();
  }

  /**
   * Check if currently watching
   */
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Setup file system watchers
   * Requirements: 11.2
   */
  private setupWatchers(workspaceRoot: string): void {
    // This is a placeholder for the actual Kiro API integration
    // In a real implementation, this would use:
    // const watcher = workspace.createFileSystemWatcher(pattern);
    // watcher.onDidCreate(uri => this.handleFileChange(uri.fsPath));
    // watcher.onDidChange(uri => this.handleFileChange(uri.fsPath));
    // watcher.onDidDelete(uri => this.handleFileChange(uri.fsPath));
    
    // For now, we'll create a mock structure that can be tested
    // and replaced with actual API calls when integrated
    
    // Note: In actual implementation, we would create watchers for include patterns
    // and filter out exclude patterns in the handler
  }

  /**
   * Handle file change event
   * Requirements: 11.2, 11.3
   */
  private handleFileChange(filePath: string): void {
    // Check if file matches exclude patterns
    if (this.shouldExcludeFile(filePath)) {
      return;
    }

    // Add to changed files set
    this.changedFiles.add(filePath);

    // Debounce the callback
    this.debounceCallback();
  }

  /**
   * Debounce callback to avoid excessive refreshes
   * Requirements: 11.3
   */
  private debounceCallback(): void {
    // Clear existing timer
    this.clearDebounceTimer();

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      if (this.callback && this.changedFiles.size > 0) {
        const event: FileChangeEvent = {
          changedFiles: new Set(this.changedFiles),
          timestamp: Date.now()
        };

        this.callback(event);
        this.changedFiles.clear();
      }
    }, this.config.autoRefreshDebounce);
  }

  /**
   * Clear debounce timer
   */
  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Check if file should be excluded based on patterns
   */
  private shouldExcludeFile(filePath: string): boolean {
    // Check exclude patterns
    for (const pattern of this.config.excludePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    // Check include patterns (if specified, file must match at least one)
    if (this.config.includePatterns.length > 0) {
      let matchesInclude = false;
      for (const pattern of this.config.includePatterns) {
        if (this.matchesPattern(filePath, pattern)) {
          matchesInclude = true;
          break;
        }
      }
      if (!matchesInclude) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports * and ** wildcards)
   * In real implementation, would use proper glob matching library
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Normalize paths
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // Handle leading **/ - matches zero or more path segments
    if (normalizedPattern.startsWith('**/')) {
      const rest = normalizedPattern.substring(3);
      // Check if path ends with the rest of the pattern
      if (normalizedPath.endsWith(rest.replace(/\*/g, '[^/]*'))) {
        return true;
      }
      // Or if any segment matches
      const parts = normalizedPath.split('/');
      for (let i = 0; i < parts.length; i++) {
        const subPath = parts.slice(i).join('/');
        if (this.matchesSimplePattern(subPath, rest)) {
          return true;
        }
      }
      return false;
    }
    
    // Handle trailing /** - matches directory and everything under it
    if (normalizedPattern.endsWith('/**')) {
      const prefix = normalizedPattern.substring(0, normalizedPattern.length - 3);
      return normalizedPath === prefix || normalizedPath.startsWith(prefix + '/');
    }
    
    return this.matchesSimplePattern(normalizedPath, normalizedPattern);
  }

  /**
   * Match simple patterns without ** (only single *)
   */
  private matchesSimplePattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '[^/]*') // * matches anything except /
      .replace(/\?/g, '[^/]'); // ? matches single char except /
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get current workspace root (placeholder)
   */
  private getCurrentWorkspaceRoot(): string | null {
    // This would be stored when start() is called
    // For now, return null as placeholder
    return null;
  }

  /**
   * Manual trigger for testing purposes
   * This allows tests to simulate file changes
   */
  triggerFileChange(filePath: string): void {
    this.handleFileChange(filePath);
  }

  /**
   * Manually trigger the debounced callback immediately (for testing)
   */
  flushPendingChanges(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      
      if (this.callback && this.changedFiles.size > 0) {
        const event: FileChangeEvent = {
          changedFiles: new Set(this.changedFiles),
          timestamp: Date.now()
        };
        
        this.callback(event);
        this.changedFiles.clear();
      }
    }
  }
}
