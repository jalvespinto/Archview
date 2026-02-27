/**
 * Type declarations for the Kiro IDE API
 * 
 * This file documents the expected types for the Kiro module
 * which will be provided by the Kiro IDE runtime.
 */

declare module 'kiro' {
  export interface KiroAI {
    sendMessage(prompt: string, options?: any): Promise<string>;
    chat?(messages: any[], options?: any): Promise<string>;
    stream?(prompt: string, options?: any): AsyncIterableIterator<string>;
  }
  
  export const ai: KiroAI;
  
  // Other Kiro APIs can be added here as needed
  export const workspace: any;
  export const window: any;
  export const commands: any;
}
