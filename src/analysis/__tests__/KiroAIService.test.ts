/**
 * Unit tests for KiroAIService
 * 
 * Tests:
 * - Tier 1 prompt construction
 * - LLM response parsing (valid and malformed)
 * - ArchitecturalModel conversion
 * - Error handling
 * - API access patterns
 * 
 * Requirements: 1.4, 2.2
 * Task: 6.1
 */

import { KiroAIService } from '../KiroAIService';
import {
  GroundingData,
  DirectoryNode,
  FileGroundingData,
  ImportEdge,
  InheritanceEdge,
  ArchitecturalModel,
} from '../../types/analysis';
import { Language, AbstractionLevel, RelationshipType } from '../../types';

// Mock the kiro-api-stub module
jest.mock('../../spike/kiro-api-stub', () => ({
  getKiroAI: jest.fn().mockResolvedValue({
    api: {
      sendMessage: jest.fn().mockResolvedValue(JSON.stringify({
        components: [
          {
            id: 'comp-1',
            name: 'Test Component',
            description: 'A test component',
            role: 'test',
            filePaths: ['/test/file.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: ['test-pattern'],
        confidence: 'high',
        ambiguousFiles: [],
      })),
    },
    isMock: true,
  }),
}));

describe('KiroAIService', () => {
  let service: KiroAIService;
  let mockGroundingData: GroundingData;

  beforeEach(() => {
    service = new KiroAIService();

    // Create minimal grounding data for testing
    mockGroundingData = {
      rootPath: '/test/project',
      timestamp: Date.now(),
      directoryTree: {
        name: 'project',
        path: '/test/project',
        children: [],
        files: ['index.ts', 'utils.ts'],
      },
      files: [
        {
          path: '/test/project/index.ts',
          language: Language.TypeScript,
          exports: ['main'],
          classes: [],
          topLevelFunctions: [{ name: 'main' }],
          imports: [{ from: './utils', symbols: ['helper'] }],
        },
        {
          path: '/test/project/utils.ts',
          language: Language.TypeScript,
          exports: ['helper'],
          classes: [],
          topLevelFunctions: [{ name: 'helper' }],
          imports: [],
        },
      ],
      importGraph: [
        {
          sourceFile: '/test/project/index.ts',
          targetFile: '/test/project/utils.ts',
          symbols: ['helper'],
        },
      ],
      inheritanceGraph: [],
    };
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('interpretArchitecture', () => {
    it('should return an ArchitecturalModel for valid grounding data', async () => {
      const result = await service.interpretArchitecture(mockGroundingData);

      expect(result).toBeDefined();
      expect(result.components).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
    });

    it('should include metadata with correct tier', async () => {
      const result = await service.interpretArchitecture(mockGroundingData, 1);

      expect(result.metadata.tierUsed).toBe(1);
      expect(result.metadata.filesAnalyzed).toBe(2);
      expect(result.metadata.llmInferenceTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle tier 2 and tier 3 requests', async () => {
      const tier2Result = await service.interpretArchitecture(mockGroundingData, 2);
      expect(tier2Result.metadata.tierUsed).toBe(2);

      const tier3Result = await service.interpretArchitecture(mockGroundingData, 3);
      expect(tier3Result.metadata.tierUsed).toBe(3);
    });

    it('should trigger enrichment for low confidence responses', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock low confidence response at tier 1, then high confidence at tier 2
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn()
        .mockResolvedValueOnce(JSON.stringify({
          components: [],
          relationships: [],
          patterns: [],
          confidence: 'low',
          ambiguousFiles: ['/test/project/index.ts'],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          components: [{
            id: 'comp1',
            name: 'Test Component',
            description: 'A test component',
            role: 'test',
            filePaths: ['/test/project/index.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null,
          }],
          relationships: [],
          patterns: [],
          confidence: 'high',
        }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const result = await service.interpretArchitecture(mockGroundingData, 1);

      // Should have called sendMessage twice (tier 1 and tier 2)
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      
      // Final result should have high confidence from tier 2
      expect(result.metadata.confidence).toBe('high');
      expect(result.metadata.tierUsed).toBe(2);
      
      // Should have logged enrichment message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Low confidence at tier 1')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not trigger enrichment for high confidence responses', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn().mockResolvedValue(JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'high',
      }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();
      await newService.interpretArchitecture(mockGroundingData, 1);

      // Should only call LLM once (no enrichment)
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      
      // Should not log enrichment message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Low confidence')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not trigger enrichment at tier 3 even with low confidence', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn().mockResolvedValue(JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'low',
        ambiguousFiles: ['/test/project/index.ts'],
      }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();
      const result = await newService.interpretArchitecture(mockGroundingData, 3);

      // Should only call LLM once (tier 3 is max)
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(result.metadata.tierUsed).toBe(3);
      expect(result.metadata.confidence).toBe('low');

      consoleLogSpy.mockRestore();
    });

    it('should trigger enrichment from tier 2 to tier 3', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn()
        .mockResolvedValueOnce(JSON.stringify({
          components: [],
          relationships: [],
          patterns: [],
          confidence: 'low',
          ambiguousFiles: ['/test/project/index.ts'],
        }))
        .mockResolvedValueOnce(JSON.stringify({
          components: [],
          relationships: [],
          patterns: [],
          confidence: 'high',
        }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();
      const result = await newService.interpretArchitecture(mockGroundingData, 2);

      // Should have called sendMessage twice (tier 2 and tier 3)
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(result.metadata.tierUsed).toBe(3);

      consoleLogSpy.mockRestore();
    });

    it('should not trigger enrichment if no ambiguous files identified', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Use grounding data with non-generic file names to avoid heuristic identification
      const nonGenericGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: ['UserService.ts', 'ProductController.ts'],
        },
        files: [
          {
            path: '/test/project/UserService.ts',
            language: Language.TypeScript,
            exports: ['UserService'],
            classes: [{ name: 'UserService' }],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/ProductController.ts',
            language: Language.TypeScript,
            exports: ['ProductController'],
            classes: [{ name: 'ProductController' }],
            topLevelFunctions: [],
            imports: [],
          },
        ],
        importGraph: [],
        inheritanceGraph: [],
      };

      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn().mockResolvedValue(JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'low',
        ambiguousFiles: [],
      }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();
      const result = await newService.interpretArchitecture(nonGenericGrounding, 1);

      // Should only call LLM once (no ambiguous files to enrich)
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(result.metadata.tierUsed).toBe(1);
      expect(result.metadata.confidence).toBe('low');

      consoleLogSpy.mockRestore();
    });

    it('should handle medium confidence without triggering enrichment', async () => {
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn().mockResolvedValue(JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'medium',
      }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();
      const result = await newService.interpretArchitecture(mockGroundingData, 1);

      // Should only call LLM once (medium confidence doesn't trigger enrichment)
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(result.metadata.confidence).toBe('medium');
    });
  });

  describe('buildTier1Prompt', () => {
    it('should include directory structure in prompt', async () => {
      // Access private method through any cast for testing
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).toContain(mockGroundingData.directoryTree.name);
    });

    it('should include file metadata in prompt', async () => {
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('Files and their exports/imports:');
      expect(prompt).toContain('index.ts');
      expect(prompt).toContain('utils.ts');
    });

    it('should include import relationships in prompt', async () => {
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('Import relationships:');
      expect(prompt).toContain('helper');
    });

    it('should include inheritance relationships in prompt', async () => {
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('Inheritance relationships:');
    });

    it('should include expected JSON structure in prompt', async () => {
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('"components"');
      expect(prompt).toContain('"relationships"');
      expect(prompt).toContain('"patterns"');
      expect(prompt).toContain('"confidence"');
      expect(prompt).toContain('"ambiguousFiles"');
    });

    it('should include architectural guidance in prompt', async () => {
      const prompt = (service as any).buildTier1Prompt(mockGroundingData);

      expect(prompt).toContain('Grouping files that belong together');
      expect(prompt).toContain('Identifying layers');
      expect(prompt).toContain('Detecting feature modules');
    });

    it('should handle grounding data with nested directory structure', () => {
      const nestedGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [
            {
              name: 'src',
              path: '/test/project/src',
              children: [
                {
                  name: 'components',
                  path: '/test/project/src/components',
                  children: [],
                  files: ['Button.tsx'],
                },
              ],
              files: ['index.ts'],
            },
          ],
          files: [],
        },
        files: [],
        importGraph: [],
        inheritanceGraph: [],
      };

      const prompt = (service as any).buildTier1Prompt(nestedGrounding);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).toContain('src');
      expect(prompt).toContain('components');
    });

    it('should handle grounding data with multiple languages', () => {
      const multiLangGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: ['app.py', 'utils.js', 'main.go'],
        },
        files: [
          {
            path: '/test/project/app.py',
            language: Language.Python,
            exports: ['main'],
            classes: [],
            topLevelFunctions: [{ name: 'main' }],
            imports: [],
          },
          {
            path: '/test/project/utils.js',
            language: Language.JavaScript,
            exports: ['helper'],
            classes: [],
            topLevelFunctions: [{ name: 'helper' }],
            imports: [],
          },
          {
            path: '/test/project/main.go',
            language: Language.Go,
            exports: ['Main'],
            classes: [],
            topLevelFunctions: [{ name: 'Main' }],
            imports: [],
          },
        ],
        importGraph: [],
        inheritanceGraph: [],
      };

      const prompt = (service as any).buildTier1Prompt(multiLangGrounding);

      expect(prompt).toContain('app.py');
      expect(prompt).toContain('utils.js');
      expect(prompt).toContain('main.go');
      expect(prompt).toContain('python');
      expect(prompt).toContain('javascript');
      expect(prompt).toContain('go');
    });

    it('should handle grounding data with class inheritance', () => {
      const inheritanceGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: ['base.ts', 'derived.ts'],
        },
        files: [
          {
            path: '/test/project/base.ts',
            language: Language.TypeScript,
            exports: ['BaseClass'],
            classes: [{ name: 'BaseClass' }],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/derived.ts',
            language: Language.TypeScript,
            exports: ['DerivedClass'],
            classes: [{ name: 'DerivedClass', superClass: 'BaseClass' }],
            topLevelFunctions: [],
            imports: [{ from: './base', symbols: ['BaseClass'] }],
          },
        ],
        importGraph: [
          {
            sourceFile: '/test/project/derived.ts',
            targetFile: '/test/project/base.ts',
            symbols: ['BaseClass'],
          },
        ],
        inheritanceGraph: [
          {
            childClass: 'DerivedClass',
            parentClass: 'BaseClass',
            sourceFile: '/test/project/derived.ts',
            type: 'extends',
          },
        ],
      };

      const prompt = (service as any).buildTier1Prompt(inheritanceGrounding);

      expect(prompt).toContain('Inheritance relationships:');
      expect(prompt).toContain('DerivedClass');
      expect(prompt).toContain('BaseClass');
      expect(prompt).toContain('extends');
    });

    it('should handle grounding data with complex import graph', () => {
      const complexImportGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: ['a.ts', 'b.ts', 'c.ts'],
        },
        files: [
          {
            path: '/test/project/a.ts',
            language: Language.TypeScript,
            exports: ['funcA'],
            classes: [],
            topLevelFunctions: [{ name: 'funcA' }],
            imports: [{ from: './b', symbols: ['funcB'] }],
          },
          {
            path: '/test/project/b.ts',
            language: Language.TypeScript,
            exports: ['funcB'],
            classes: [],
            topLevelFunctions: [{ name: 'funcB' }],
            imports: [{ from: './c', symbols: ['funcC'] }],
          },
          {
            path: '/test/project/c.ts',
            language: Language.TypeScript,
            exports: ['funcC'],
            classes: [],
            topLevelFunctions: [{ name: 'funcC' }],
            imports: [],
          },
        ],
        importGraph: [
          {
            sourceFile: '/test/project/a.ts',
            targetFile: '/test/project/b.ts',
            symbols: ['funcB'],
          },
          {
            sourceFile: '/test/project/b.ts',
            targetFile: '/test/project/c.ts',
            symbols: ['funcC'],
          },
        ],
        inheritanceGraph: [],
      };

      const prompt = (service as any).buildTier1Prompt(complexImportGrounding);

      expect(prompt).toContain('Import relationships:');
      expect(prompt).toContain('funcB');
      expect(prompt).toContain('funcC');
    });

    it('should handle empty grounding data', () => {
      const emptyGrounding: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: [],
        },
        files: [],
        importGraph: [],
        inheritanceGraph: [],
      };

      const prompt = (service as any).buildTier1Prompt(emptyGrounding);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).toContain('Files and their exports/imports:');
      expect(prompt).toContain('Import relationships:');
      expect(prompt).toContain('Inheritance relationships:');
    });
  });

  describe('parseLLMResponse', () => {
    it('should parse valid JSON string response', () => {
      const validResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'high',
      });

      const parsed = (service as any).parseLLMResponse(validResponse);

      expect(parsed).toBeDefined();
      expect(parsed.components).toEqual([]);
      expect(parsed.confidence).toBe('high');
    });

    it('should handle object response', () => {
      const objectResponse = {
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'medium' as const,
      };

      const parsed = (service as any).parseLLMResponse(objectResponse);

      expect(parsed).toEqual(objectResponse);
    });

    it('should throw error for malformed JSON', () => {
      const malformedResponse = '{ invalid json }';

      expect(() => {
        (service as any).parseLLMResponse(malformedResponse);
      }).toThrow('Failed to parse LLM response as JSON');
    });

    it('should throw error for missing components array', () => {
      const invalidResponse = JSON.stringify({
        relationships: [],
        patterns: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid components array');
    });

    it('should throw error for missing relationships array', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        patterns: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid relationships array');
    });

    it('should throw error for missing patterns array', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        relationships: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid patterns array');
    });

    it('should throw error for invalid confidence level', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'invalid',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid confidence level');
    });

    it('should throw error for non-array components', () => {
      const invalidResponse = JSON.stringify({
        components: 'not an array',
        relationships: [],
        patterns: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid components array');
    });

    it('should throw error for non-array relationships', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        relationships: 'not an array',
        patterns: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid relationships array');
    });

    it('should throw error for non-array patterns', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: 'not an array',
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid patterns array');
    });

    it('should throw error for null components', () => {
      const invalidResponse = JSON.stringify({
        components: null,
        relationships: [],
        patterns: [],
        confidence: 'high',
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid components array');
    });

    it('should throw error for undefined confidence', () => {
      const invalidResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
      });

      expect(() => {
        (service as any).parseLLMResponse(invalidResponse);
      }).toThrow('missing or invalid confidence level');
    });

    it('should parse response with valid components structure', () => {
      const validResponse = JSON.stringify({
        components: [
          {
            id: 'comp-1',
            name: 'Test Component',
            description: 'A test',
            role: 'test',
            filePaths: ['/test.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: ['test-pattern'],
        confidence: 'high',
      });

      const parsed = (service as any).parseLLMResponse(validResponse);

      expect(parsed.components).toHaveLength(1);
      expect(parsed.components[0].name).toBe('Test Component');
      expect(parsed.patterns).toEqual(['test-pattern']);
    });

    it('should parse response with valid relationships structure', () => {
      const validResponse = JSON.stringify({
        components: [],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'import',
            description: 'Test relationship',
            strength: 0.8,
          },
        ],
        patterns: [],
        confidence: 'medium',
      });

      const parsed = (service as any).parseLLMResponse(validResponse);

      expect(parsed.relationships).toHaveLength(1);
      expect(parsed.relationships[0].type).toBe('import');
      expect(parsed.relationships[0].strength).toBe(0.8);
    });

    it('should parse response with ambiguousFiles field', () => {
      const validResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'low',
        ambiguousFiles: ['/test/file1.ts', '/test/file2.ts'],
      });

      const parsed = (service as any).parseLLMResponse(validResponse);

      expect(parsed.ambiguousFiles).toEqual(['/test/file1.ts', '/test/file2.ts']);
    });

    it('should handle response without ambiguousFiles field', () => {
      const validResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'high',
      });

      const parsed = (service as any).parseLLMResponse(validResponse);

      expect(parsed.ambiguousFiles).toBeUndefined();
    });
  });

  describe('convertToArchitecturalModel', () => {
    it('should convert LLM response to ArchitecturalModel', () => {
      const llmResponse = {
        components: [
          {
            id: 'comp-1',
            name: 'Main Module',
            description: 'The main entry point',
            role: 'entry point',
            filePaths: ['/test/project/index.ts'],
            abstractionLevel: 1,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'import',
            description: 'Imports utilities',
            strength: 0.8,
          },
        ],
        patterns: ['modular'],
        confidence: 'high' as const,
      };

      const model = (service as any).convertToArchitecturalModel(
        llmResponse,
        mockGroundingData,
        1,
        100
      );

      expect(model.components).toHaveLength(1);
      expect(model.components[0].name).toBe('Main Module');
      expect(model.relationships).toHaveLength(1);
      expect(model.patterns).toEqual(['modular']);
      expect(model.metadata.confidence).toBe('high');
      expect(model.metadata.tierUsed).toBe(1);
      expect(model.metadata.llmInferenceTimeMs).toBe(100);
      expect(model.metadata.filesAnalyzed).toBe(2);
    });

    it('should map abstraction levels correctly', () => {
      const llmResponse = {
        components: [
          {
            id: 'comp-1',
            name: 'Overview Component',
            description: 'Level 1',
            role: 'overview',
            filePaths: [],
            abstractionLevel: 1,
            subComponents: [],
            parent: null,
          },
          {
            id: 'comp-2',
            name: 'Module Component',
            description: 'Level 2',
            role: 'module',
            filePaths: [],
            abstractionLevel: 2,
            subComponents: [],
            parent: null,
          },
          {
            id: 'comp-3',
            name: 'Detailed Component',
            description: 'Level 3',
            role: 'detailed',
            filePaths: [],
            abstractionLevel: 3,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        confidence: 'high' as const,
      };

      const model = (service as any).convertToArchitecturalModel(
        llmResponse,
        mockGroundingData,
        1,
        100
      );

      expect(model.components[0].abstractionLevel).toBe(AbstractionLevel.Overview);
      expect(model.components[1].abstractionLevel).toBe(AbstractionLevel.Module);
      expect(model.components[2].abstractionLevel).toBe(AbstractionLevel.Detailed);
    });

    it('should map relationship types correctly', () => {
      const llmResponse = {
        components: [],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'import',
            description: 'Import',
            strength: 0.8,
          },
          {
            id: 'rel-2',
            sourceId: 'comp-1',
            targetId: 'comp-3',
            type: 'dependency',
            description: 'Dependency',
            strength: 0.6,
          },
          {
            id: 'rel-3',
            sourceId: 'comp-2',
            targetId: 'comp-3',
            type: 'inheritance',
            description: 'Inheritance',
            strength: 0.9,
          },
          {
            id: 'rel-4',
            sourceId: 'comp-1',
            targetId: 'comp-4',
            type: 'composition',
            description: 'Composition',
            strength: 0.7,
          },
          {
            id: 'rel-5',
            sourceId: 'comp-1',
            targetId: 'comp-5',
            type: 'function_call',
            description: 'Function call',
            strength: 0.5,
          },
        ],
        patterns: [],
        confidence: 'high' as const,
      };

      const model = (service as any).convertToArchitecturalModel(
        llmResponse,
        mockGroundingData,
        1,
        100
      );

      expect(model.relationships[0].type).toBe(RelationshipType.Import);
      expect(model.relationships[1].type).toBe(RelationshipType.Dependency);
      expect(model.relationships[2].type).toBe(RelationshipType.Inheritance);
      expect(model.relationships[3].type).toBe(RelationshipType.Composition);
      expect(model.relationships[4].type).toBe(RelationshipType.FunctionCall);
    });

    it('should default to Dependency for unknown relationship types', () => {
      const llmResponse = {
        components: [],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'unknown_type',
            description: 'Unknown',
            strength: 0.5,
          },
        ],
        patterns: [],
        confidence: 'high' as const,
      };

      const model = (service as any).convertToArchitecturalModel(
        llmResponse,
        mockGroundingData,
        1,
        100
      );

      expect(model.relationships[0].type).toBe(RelationshipType.Dependency);
    });
  });

  describe('enrichGrounding', () => {
    it('should enrich grounding data to tier 2', async () => {
      const ambiguousFiles = ['/test/project/index.ts'];
      
      // Mock file system for tier 2 enrichment
      jest.mock('fs/promises', () => ({
        readFile: jest.fn().mockResolvedValue('function test() {}'),
      }));

      const enriched = await (service as any).enrichGrounding(
        mockGroundingData,
        ambiguousFiles,
        2
      );

      expect(enriched).toBeDefined();
      expect(enriched.files).toHaveLength(mockGroundingData.files.length);
    });

    it('should enrich grounding data to tier 3', async () => {
      const ambiguousFiles = ['/test/project/index.ts'];
      
      // Mock file system for tier 3 enrichment
      jest.mock('fs/promises', () => ({
        readFile: jest.fn().mockResolvedValue('line 1\nline 2\nline 3'),
      }));

      const enriched = await (service as any).enrichGrounding(
        mockGroundingData,
        ambiguousFiles,
        3
      );

      expect(enriched).toBeDefined();
      expect(enriched.files).toHaveLength(mockGroundingData.files.length);
    });

    it('should handle enrichment errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const ambiguousFiles = ['/test/project/nonexistent.ts'];

      // Should not throw, just log warnings
      await expect(
        (service as any).enrichGrounding(mockGroundingData, ambiguousFiles, 2)
      ).resolves.toBeDefined();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('extractAmbiguousFiles', () => {
    it('should use LLM-provided ambiguous files when available', () => {
      const llmResponse = {
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'low' as const,
        ambiguousFiles: ['/test/project/util.ts', '/test/project/helper.ts'],
      };

      const ambiguous = (service as any).extractAmbiguousFiles(
        llmResponse,
        mockGroundingData
      );

      expect(ambiguous).toEqual(['/test/project/util.ts', '/test/project/helper.ts']);
    });

    it('should heuristically identify ambiguous files with generic names', () => {
      const llmResponse = {
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'low' as const,
      };

      const groundingWithGenericFiles = {
        ...mockGroundingData,
        files: [
          {
            path: '/test/project/util.ts',
            language: Language.TypeScript,
            exports: ['helper'],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/index.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
        ],
      };

      const ambiguous = (service as any).extractAmbiguousFiles(
        llmResponse,
        groundingWithGenericFiles
      );

      // Should identify both util.ts (generic name) and index.ts (generic name + no exports)
      expect(ambiguous.length).toBeGreaterThan(0);
      expect(ambiguous).toContain('/test/project/util.ts');
      expect(ambiguous).toContain('/test/project/index.ts');
    });
  });

  describe('buildPromptForTier', () => {
    it('should build tier 1 prompt', () => {
      const prompt = (service as any).buildPromptForTier(mockGroundingData, 1);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).not.toContain('TIER 2 ENRICHMENT');
      expect(prompt).not.toContain('TIER 3 ENRICHMENT');
    });

    it('should build tier 2 prompt with enrichment notice', () => {
      const prompt = (service as any).buildPromptForTier(mockGroundingData, 2);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).toContain('TIER 2 ENRICHMENT');
      expect(prompt).not.toContain('TIER 3 ENRICHMENT');
    });

    it('should build tier 3 prompt with content excerpts', () => {
      const groundingWithExcerpts = {
        ...mockGroundingData,
        files: [
          {
            ...mockGroundingData.files[0],
            contentExcerpt: 'const x = 1;\nconst y = 2;',
          } as any,
        ],
      };

      const prompt = (service as any).buildPromptForTier(groundingWithExcerpts, 3);

      expect(prompt).toContain('Directory structure:');
      expect(prompt).toContain('TIER 2 ENRICHMENT');
      expect(prompt).toContain('TIER 3 ENRICHMENT');
      expect(prompt).toContain('const x = 1;');
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      // Reset mock for each test
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      (getKiroAI as jest.Mock).mockResolvedValue({
        api: {
          sendMessage: jest.fn().mockResolvedValue(JSON.stringify({
            components: [],
            relationships: [],
            patterns: [],
            confidence: 'high',
          })),
        },
        isMock: true,
      });
      
      // Create fresh service instance
      service = new KiroAIService();
    });

    it('should cache architectural model responses', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // First call should be a cache miss
      const result1 = await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      // Second call with same grounding data should be a cache hit
      const result2 = await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );

      // Results should be identical
      expect(result2).toEqual(result1);

      consoleLogSpy.mockRestore();
    });

    it('should cache tier-specific responses separately', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Cache tier 1
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      // Tier 2 should be a cache miss (different tier)
      await service.interpretArchitecture(mockGroundingData, 2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 2')
      );

      // Tier 1 should still be a cache hit
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );

      consoleLogSpy.mockRestore();
    });

    it('should clear cache when requested', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Cache a result
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      // Verify cache hit
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );

      // Clear cache
      service.clearCache();

      // Should be a cache miss again
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      consoleLogSpy.mockRestore();
    });

    it('should report cache statistics', async () => {
      let stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);

      // Add one entry
      await service.interpretArchitecture(mockGroundingData, 1);
      stats = service.getCacheStats();
      expect(stats.size).toBe(1);

      // Add another tier
      await service.interpretArchitecture(mockGroundingData, 2);
      stats = service.getCacheStats();
      expect(stats.size).toBe(2);

      // Clear cache
      service.clearCache();
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should reduce LLM API calls with caching', async () => {
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      const mockSendMessage = jest.fn().mockResolvedValue(JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'high',
      }));

      (getKiroAI as jest.Mock).mockResolvedValue({
        api: { sendMessage: mockSendMessage },
        isMock: true,
      });

      const newService = new KiroAIService();

      // First call should invoke LLM
      await newService.interpretArchitecture(mockGroundingData, 1);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);

      // Second call should use cache (no additional LLM call)
      await newService.interpretArchitecture(mockGroundingData, 1);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);

      // Third call should use cache
      await newService.interpretArchitecture(mockGroundingData, 1);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    it('should cache different grounding data separately', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const alternateGrounding: GroundingData = {
        ...mockGroundingData,
        rootPath: '/different/path',
      };

      // Cache first grounding data
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      // Different grounding data should be a cache miss
      await service.interpretArchitecture(alternateGrounding, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss for tier 1')
      );

      // Original grounding data should still be a cache hit
      await service.interpretArchitecture(mockGroundingData, 1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle cache with multiple different grounding data', async () => {
      const grounding1 = { ...mockGroundingData, rootPath: '/path1' };
      const grounding2 = { ...mockGroundingData, rootPath: '/path2' };
      const grounding3 = { ...mockGroundingData, rootPath: '/path3' };

      // Cache all three
      await service.interpretArchitecture(grounding1, 1);
      await service.interpretArchitecture(grounding2, 1);
      await service.interpretArchitecture(grounding3, 1);

      const stats = service.getCacheStats();
      expect(stats.size).toBe(3);

      // All should be cache hits now
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.interpretArchitecture(grounding1, 1);
      await service.interpretArchitecture(grounding2, 1);
      await service.interpretArchitecture(grounding3, 1);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should throw error when Kiro AI is not available', async () => {
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      (getKiroAI as jest.Mock).mockRejectedValueOnce(new Error('Not available'));

      const newService = new KiroAIService();

      await expect(newService.initialize()).rejects.toThrow(
        'Kiro AI API not available'
      );
    });

    it('should handle malformed JSON with extra fields gracefully', () => {
      const responseWithExtraFields = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'high',
        extraField: 'should be ignored',
        anotherExtra: 123,
      });

      const parsed = (service as any).parseLLMResponse(responseWithExtraFields);

      expect(parsed).toBeDefined();
      expect(parsed.components).toEqual([]);
      expect(parsed.confidence).toBe('high');
    });

    it('should handle empty arrays in LLM response', () => {
      const emptyResponse = JSON.stringify({
        components: [],
        relationships: [],
        patterns: [],
        confidence: 'medium',
      });

      const parsed = (service as any).parseLLMResponse(emptyResponse);

      expect(parsed.components).toEqual([]);
      expect(parsed.relationships).toEqual([]);
      expect(parsed.patterns).toEqual([]);
    });
  });

  describe('fallback strategy', () => {
    it('should use heuristic model when LLM fails', async () => {
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      (getKiroAI as jest.Mock).mockResolvedValueOnce({
        api: {
          sendMessage: jest.fn().mockRejectedValue(new Error('LLM error')),
        },
        isMock: true,
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const newService = new KiroAIService();

      const result = await newService.interpretArchitecture(mockGroundingData);

      // Should have logged fallback warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM interpretation failed, using heuristic fallback'),
        expect.any(Error)
      );

      // Should return a valid model
      expect(result).toBeDefined();
      expect(result.components).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.patterns).toEqual([]); // No patterns in heuristic mode
      expect(result.metadata.confidence).toBe('low'); // Always low confidence

      consoleWarnSpy.mockRestore();
    });

    it('should group files by top-level directory', async () => {
      const groundingWithMultipleDirs: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [
            {
              name: 'src',
              path: '/test/project/src',
              children: [],
              files: ['index.ts'],
            },
            {
              name: 'lib',
              path: '/test/project/lib',
              children: [],
              files: ['utils.ts'],
            },
          ],
          files: [],
        },
        files: [
          {
            path: '/test/project/src/index.ts',
            language: Language.TypeScript,
            exports: ['main'],
            classes: [],
            topLevelFunctions: [{ name: 'main' }],
            imports: [],
          },
          {
            path: '/test/project/lib/utils.ts',
            language: Language.TypeScript,
            exports: ['helper'],
            classes: [],
            topLevelFunctions: [{ name: 'helper' }],
            imports: [],
          },
        ],
        importGraph: [],
        inheritanceGraph: [],
      };

      const model = (service as any).buildHeuristicModel(groundingWithMultipleDirs, 100);

      // Should create separate components for src and lib directories
      expect(model.components.length).toBeGreaterThanOrEqual(2);
      
      const srcComponent = model.components.find((c: any) => 
        c.filePaths.some((p: string) => p.includes('/src/'))
      );
      const libComponent = model.components.find((c: any) => 
        c.filePaths.some((p: string) => p.includes('/lib/'))
      );

      expect(srcComponent).toBeDefined();
      expect(libComponent).toBeDefined();
    });

    it('should derive relationships from import graph', async () => {
      const groundingWithImports: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: [],
        },
        files: [
          {
            path: '/test/project/src/index.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/lib/utils.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
        ],
        importGraph: [
          {
            sourceFile: '/test/project/src/index.ts',
            targetFile: '/test/project/lib/utils.ts',
            symbols: ['helper'],
          },
        ],
        inheritanceGraph: [],
      };

      const model = (service as any).buildHeuristicModel(groundingWithImports, 100);

      // Should create relationships based on import graph
      expect(model.relationships.length).toBeGreaterThan(0);
      
      const relationship = model.relationships[0];
      expect(relationship.type).toBe(RelationshipType.Import);
      expect(relationship.strength).toBe(0.5); // Medium strength for heuristic
    });

    it('should mark fallback model with low confidence', async () => {
      const model = (service as any).buildHeuristicModel(mockGroundingData, 100);

      expect(model.metadata.confidence).toBe('low');
      expect(model.metadata.tierUsed).toBe(1);
      expect(model.metadata.llmInferenceTimeMs).toBe(100);
    });

    it('should format directory names as component names', () => {
      expect((service as any).formatComponentName('src')).toBe('Src');
      expect((service as any).formatComponentName('my-module')).toBe('My Module');
      expect((service as any).formatComponentName('my_module')).toBe('My Module');
      expect((service as any).formatComponentName('.')).toBe('Root');
      expect((service as any).formatComponentName('API-Gateway')).toBe('Api Gateway');
    });

    it('should sanitize IDs correctly', () => {
      expect((service as any).sanitizeId('src/components')).toBe('src-components');
      expect((service as any).sanitizeId('my module')).toBe('my-module');
      expect((service as any).sanitizeId('test@#$%component')).toBe('test-component');
      expect((service as any).sanitizeId('--test--')).toBe('test');
    });

    it('should handle root directory files', () => {
      const groundingWithRootFiles: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: ['index.ts'],
        },
        files: [
          {
            path: '/test/project/index.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
        ],
        importGraph: [],
        inheritanceGraph: [],
      };

      const model = (service as any).buildHeuristicModel(groundingWithRootFiles, 100);

      // Should create a component for root directory
      expect(model.components.length).toBeGreaterThan(0);
      const rootComponent = model.components.find((c: any) => c.name === 'Root');
      expect(rootComponent).toBeDefined();
    });

    it('should not create duplicate relationships', async () => {
      const groundingWithDuplicateImports: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: [],
        },
        files: [
          {
            path: '/test/project/src/a.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/src/b.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/lib/utils.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
        ],
        importGraph: [
          {
            sourceFile: '/test/project/src/a.ts',
            targetFile: '/test/project/lib/utils.ts',
            symbols: ['helper1'],
          },
          {
            sourceFile: '/test/project/src/b.ts',
            targetFile: '/test/project/lib/utils.ts',
            symbols: ['helper2'],
          },
        ],
        inheritanceGraph: [],
      };

      const model = (service as any).buildHeuristicModel(groundingWithDuplicateImports, 100);

      // Should only create one relationship from src to lib (not two)
      const srcToLibRels = model.relationships.filter((r: any) => 
        r.sourceId.includes('src') && r.targetId.includes('lib')
      );
      expect(srcToLibRels.length).toBe(1);
    });

    it('should not create self-referencing relationships', async () => {
      const groundingWithSelfImports: GroundingData = {
        rootPath: '/test/project',
        timestamp: Date.now(),
        directoryTree: {
          name: 'project',
          path: '/test/project',
          children: [],
          files: [],
        },
        files: [
          {
            path: '/test/project/src/a.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
          {
            path: '/test/project/src/b.ts',
            language: Language.TypeScript,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: [],
          },
        ],
        importGraph: [
          {
            sourceFile: '/test/project/src/a.ts',
            targetFile: '/test/project/src/b.ts',
            symbols: ['helper'],
          },
        ],
        inheritanceGraph: [],
      };

      const model = (service as any).buildHeuristicModel(groundingWithSelfImports, 100);

      // Should not create relationships within the same component (src)
      expect(model.relationships.length).toBe(0);
    });

    it('should cache fallback models', async () => {
      const { getKiroAI } = await import('../../spike/kiro-api-stub');
      (getKiroAI as jest.Mock).mockResolvedValue({
        api: {
          sendMessage: jest.fn().mockRejectedValue(new Error('LLM error')),
        },
        isMock: true,
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const newService = new KiroAIService();

      // First call should use fallback
      const result1 = await newService.interpretArchitecture(mockGroundingData);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache (no additional fallback warning)
      const result2 = await newService.interpretArchitecture(mockGroundingData);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for tier 1')
      );
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // Still only once

      // Results should be identical
      expect(result2).toEqual(result1);

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
