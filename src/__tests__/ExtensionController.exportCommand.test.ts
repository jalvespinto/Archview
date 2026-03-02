import * as vscode from 'vscode';
import { ExtensionController } from '../ExtensionController';

function createMockContext() {
  return {
    subscriptions: [],
    globalState: {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined)
    }
  };
}

describe('ExtensionController export command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace as { workspaceFolders?: Array<{ uri: { fsPath: string } }> }).workspaceFolders = [
      { uri: { fsPath: '/workspace' } }
    ];
  });

  it('rejects invalid export format values at command boundary', async () => {
    const controller = new ExtensionController();
    const exportSpy = jest.spyOn(controller, 'exportDiagram').mockResolvedValue();

    await controller.activate(createMockContext());

    const registerMock = vscode.commands.registerCommand as jest.Mock;
    const exportRegistration = registerMock.mock.calls.find(
      (call: unknown[]) => call[0] === 'archview.exportDiagram'
    );

    expect(exportRegistration).toBeDefined();
    const exportCallback = exportRegistration?.[1] as (format: unknown) => Promise<void>;

    await exportCallback('pdf');

    expect(exportSpy).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Invalid export format. Use "png" or "svg".'
    );
  });

  it('normalizes valid export format values from command arguments', async () => {
    const controller = new ExtensionController();
    const exportSpy = jest.spyOn(controller, 'exportDiagram').mockResolvedValue();

    await controller.activate(createMockContext());

    const registerMock = vscode.commands.registerCommand as jest.Mock;
    const exportRegistration = registerMock.mock.calls.find(
      (call: unknown[]) => call[0] === 'archview.exportDiagram'
    );

    expect(exportRegistration).toBeDefined();
    const exportCallback = exportRegistration?.[1] as (format: unknown) => Promise<void>;

    await exportCallback(' SVG ');

    expect(exportSpy).toHaveBeenCalledWith('svg');
  });
});
