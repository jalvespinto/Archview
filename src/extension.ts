/**
 * Extension entry point
 * Requirements: 8.1, 8.6
 */

import { ExtensionController } from './ExtensionController';

// Global extension controller instance
let controller: ExtensionController | null = null;

/**
 * Activate extension
 * Requirements: 8.1, 8.6
 */
export async function activate(context: any): Promise<void> {
  console.log('ArchView extension activating...');
  
  controller = new ExtensionController();
  await controller.activate(context);
  
  console.log('ArchView extension activated successfully');
}

/**
 * Deactivate extension
 * Requirements: 8.1
 */
export async function deactivate(): Promise<void> {
  console.log('ArchView extension deactivating...');
  
  if (controller) {
    await controller.deactivate();
    controller = null;
  }
  
  console.log('ArchView extension deactivated successfully');
}
