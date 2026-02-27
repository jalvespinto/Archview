/**
 * Kiro API Stub for POC Testing
 * 
 * This file documents the expected Kiro AI API interface
 * based on the design document and common IDE extension patterns.
 * 
 * This is a STUB - the actual Kiro API will be provided by the Kiro IDE runtime.
 */

/**
 * Expected Kiro AI API Interface
 * 
 * This interface represents what we expect the Kiro AI API to provide
 * based on the design document requirements.
 */
export interface KiroAIAPI {
  /**
   * Send a message to the AI and get a response
   * 
   * @param prompt - The prompt to send to the AI
   * @param options - Optional configuration
   * @returns Promise resolving to the AI response
   */
  sendMessage(prompt: string, options?: AIRequestOptions): Promise<string>;
  
  /**
   * Send a structured message with conversation history
   * 
   * @param messages - Array of conversation messages
   * @param options - Optional configuration
   * @returns Promise resolving to the AI response
   */
  chat?(messages: AIMessage[], options?: AIRequestOptions): Promise<string>;
  
  /**
   * Stream a response from the AI
   * 
   * @param prompt - The prompt to send to the AI
   * @param options - Optional configuration
   * @returns Async iterator of response chunks
   */
  stream?(prompt: string, options?: AIRequestOptions): AsyncIterableIterator<string>;
}

export interface AIRequestOptions {
  /**
   * Maximum tokens to generate in the response
   */
  maxTokens?: number;
  
  /**
   * Temperature for response generation (0-1)
   */
  temperature?: number;
  
  /**
   * Expected response format
   */
  format?: 'text' | 'json';
  
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Mock implementation for testing when Kiro API is not available
 */
export class MockKiroAI implements KiroAIAPI {
  async sendMessage(prompt: string, options?: AIRequestOptions): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if prompt is asking for architecture interpretation
    if (prompt.includes('architecture') || prompt.includes('components')) {
      // Return a mock architectural model response
      return JSON.stringify({
        components: [
          {
            id: 'comp-1',
            name: 'Main Module',
            description: 'The main entry point of the application',
            role: 'entry point',
            filePaths: ['/test/project/index.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null
          },
          {
            id: 'comp-2',
            name: 'Utilities',
            description: 'Helper functions and utilities',
            role: 'utilities',
            filePaths: ['/test/project/utils.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null
          }
        ],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'import',
            description: 'Main module imports utilities',
            strength: 0.8
          }
        ],
        patterns: ['modular'],
        confidence: 'high',
        ambiguousFiles: []
      });
    }
    
    // Default response
    return 'Mock AI response';
  }
  
  async chat(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    return this.sendMessage(lastMessage.content, options);
  }
  
  async *stream(prompt: string, options?: AIRequestOptions): AsyncIterableIterator<string> {
    const response = await this.sendMessage(prompt, options);
    // Simulate streaming by yielding chunks
    const chunkSize = 10;
    for (let i = 0; i < response.length; i += chunkSize) {
      yield response.slice(i, i + chunkSize);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * Attempt to get the real Kiro AI API, fall back to mock if not available
 */
export async function getKiroAI(): Promise<{ api: KiroAIAPI; isMock: boolean }> {
  // Try to import the real Kiro module
  try {
    const kiro = await import('kiro');
    if (kiro && kiro.ai) {
      return { api: kiro.ai, isMock: false };
    }
  } catch (e) {
    // Kiro module not available
  }
  
  // Try global object
  if (typeof (global as any).kiro !== 'undefined') {
    const kiro = (global as any).kiro;
    if (kiro && kiro.ai) {
      return { api: kiro.ai, isMock: false };
    }
  }
  
  // Fall back to mock
  console.warn('Kiro AI API not available, using mock implementation');
  return { api: new MockKiroAI(), isMock: true };
}

/**
 * Type guard to check if an object implements KiroAIAPI
 */
export function isKiroAIAPI(obj: any): obj is KiroAIAPI {
  return obj && typeof obj.sendMessage === 'function';
}
