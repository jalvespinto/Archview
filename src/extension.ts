/**
 * Extension entry point
 * Requirements: 8.1, 8.6
 */

import * as vscode from 'vscode';
import { ExtensionController } from './ExtensionController';

// Global extension controller instance
let controller: ExtensionController | null = null;

/**
 * Activate extension
 * Requirements: 8.1, 8.6
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  controller = new ExtensionController();
  await controller.activate(context);
}

/**
 * Deactivate extension
 * Requirements: 8.1
 */
export async function deactivate(): Promise<void> {
  if (controller) {
    await controller.deactivate();
    controller = null;
  }
}
