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

export const workspace = {
  workspaceFolders: undefined as any,
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue)
  })),
  onDidChangeConfiguration: jest.fn(),
  createFileSystemWatcher: jest.fn()
};

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
  parse: jest.fn((uri: string) => ({ fsPath: uri }))
};
