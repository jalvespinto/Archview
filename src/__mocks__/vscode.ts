/**
 * Mock for VS Code API
 * Used in tests to avoid requiring the actual vscode module
 */

export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3
}

export const commands = {
  registerCommand: jest.fn((command: string, callback: (...args: any[]) => any) => {
    return {
      dispose: jest.fn()
    };
  }),
  executeCommand: jest.fn()
};

export const window = {
  createWebviewPanel: jest.fn((viewType: string, title: string, showOptions: any, options: any) => {
    return {
      webview: {
        html: '',
        postMessage: jest.fn(),
        onDidReceiveMessage: jest.fn()
      },
      onDidDispose: jest.fn(),
      reveal: jest.fn(),
      dispose: jest.fn()
    };
  }),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn()
};

/**
 * Helper: create a mock FileSystemWatcher that behaves like the real VS Code one.
 * Each onDid* stores the callback so tests can simulate file events.
 */
function createMockFileSystemWatcher() {
  const watcher = {
    onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
    onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
    onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
    dispose: jest.fn(),
  };
  return watcher;
}

export const workspace = {
  workspaceFolders: undefined as any,
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue)
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  createFileSystemWatcher: jest.fn(() => createMockFileSystemWatcher()),
};

export class RelativePattern {
  base: string;
  pattern: string;
  constructor(base: string, pattern: string) {
    this.base = base;
    this.pattern = pattern;
  }
}

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
  parse: jest.fn((uri: string) => ({ fsPath: uri }))
};
