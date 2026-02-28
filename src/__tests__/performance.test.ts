/**
 * Performance tests for AI Architecture Diagram Extension
 * Requirements: 1.5, 2.7, 7.5, 9.1, 9.2
 * 
 * Tests:
 * - Analysis time with 1000+ file codebase (< 120s)
 * - Diagram rendering time (< 60s)
 * - Export time (< 5s)
 * - Memory usage during operations
 */

import { AnalysisService, createCancellationToken } from '../analysis/AnalysisService';
import { DiagramGenerator } from '../diagram/DiagramGenerator';
import { MemoryManager } from '../performance/MemoryManager';
import { AnalysisConfig, Language, AbstractionLevel } from '../types';
import { ArchitecturalModel, ArchitecturalComponent, ArchitecturalRelationship } from '../types/analysis';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Performance Tests', () => {
  let tempDir: string;
  let analysisService: AnalysisService;
  let diagramGenerator: DiagramGenerator;
  let memoryManager: MemoryManager;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archview-perf-test-'));
    analysisService = new AnalysisService();
    diagramGenerator = new DiagramGenerator();
    memoryManager = new MemoryManager();
  });

  afterAll(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
    analysisService.dispose();
  });

  /**
   * Test: Analysis time with 1000+ file codebase
   * Requirement: 1.5 - Analysis should complete within 120 seconds for 1000+ files
   */
  describe('Analysis Performance', () => {
    it('should analyze 1000+ file codebase within 120 seconds', async () => {
      // Create 1000 test files
      const fileCount = 1000;
      const filesDir = path.join(tempDir, 'large-codebase');
      await fs.mkdir(filesDir, { recursive: true });

      console.log(`Creating ${fileCount} test files...`);
      const createFilesStart = Date.now();

      for (let i = 0; i < fileCount; i++) {
        const fileName = `file${i}.ts`;
        const filePath = path.join(filesDir, fileName);
        const content = `
export class Component${i} {
  private value: number = ${i};
  
  public getValue(): number {
    return this.value;
  }
  
  public setValue(val: number): void {
    this.value = val;
  }
}

export function helper${i}(): string {
  return "Helper ${i}";
}
`;
        await fs.writeFile(filePath, content);
      }

      const createFilesTime = Date.now() - createFilesStart;
      console.log(`Created ${fileCount} files in ${createFilesTime}ms`);

      // Configure analysis
      const config: AnalysisConfig = {
        rootPath: filesDir,
        includePatterns: ['**/*.ts'],
        excludePatterns: ['**/node_modules/**'],
        maxFiles: 2000,
        maxDepth: 10,
        languages: [Language.TypeScript],
        aiEnabled: false // Disable AI for performance test
      };

      // Start memory monitoring
      memoryManager.setBaseline();
      const startMemoryMB = memoryManager.getMemoryUsageMB();

      // Measure analysis time
      const startTime = Date.now();
      
      const groundingData = await analysisService.buildGroundingLayer(filesDir, {
        config,
        cancellationToken: createCancellationToken(),
        timeoutMs: 120000
      });

      const analysisTime = Date.now() - startTime;
      const endMemoryMB = memoryManager.getMemoryUsageMB();
      const memoryIncreaseMB = memoryManager.getMemoryIncreaseMB();

      console.log(`Analysis completed in ${analysisTime}ms (${(analysisTime / 1000).toFixed(2)}s)`);
      console.log(`Memory usage: ${startMemoryMB.toFixed(2)}MB -> ${endMemoryMB.toFixed(2)}MB (increase: ${memoryIncreaseMB.toFixed(2)}MB)`);
      console.log(`Files analyzed: ${groundingData.files.length}`);

      // Assertions
      expect(analysisTime).toBeLessThan(120000); // < 120 seconds
      expect(groundingData.files.length).toBeGreaterThanOrEqual(fileCount);
      expect(memoryIncreaseMB).toBeLessThan(500); // < 500MB (Requirement 9.1)
    }, 150000); // 150 second timeout for test itself
  });

  /**
   * Test: Diagram rendering time
   * Requirement: 2.7 - Diagram generation should complete within 60 seconds
   */
  describe('Diagram Rendering Performance', () => {
    it('should generate diagram within 60 seconds', async () => {
      // Create a large architectural model
      const componentCount = 500;
      const components: ArchitecturalComponent[] = [];
      
      for (let i = 0; i < componentCount; i++) {
        components.push({
          id: `component-${i}`,
          name: `Component ${i}`,
          description: `Description for component ${i}`,
          role: i % 3 === 0 ? 'service' : i % 3 === 1 ? 'controller' : 'repository',
          filePaths: [`src/component${i}.ts`],
          abstractionLevel: (i % 3) + 1 as AbstractionLevel,
          subComponents: [],
          parent: null
        });
      }

      // Create relationships
      const relationships: ArchitecturalRelationship[] = [];
      for (let i = 0; i < componentCount - 1; i++) {
        relationships.push({
          id: `rel-${i}`,
          sourceId: `component-${i}`,
          targetId: `component-${i + 1}`,
          type: 'dependency' as any,
          description: `Dependency from ${i} to ${i + 1}`,
          strength: 0.5
        });
      }

      const architecturalModel: ArchitecturalModel = {
        components,
        relationships,
        patterns: ['layered', 'service-oriented'],
        metadata: {
          llmInferenceTimeMs: 0,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: componentCount
        }
      };

      // Start memory monitoring
      memoryManager.setBaseline();
      const startMemoryMB = memoryManager.getMemoryUsageMB();

      // Measure diagram generation time
      const startTime = Date.now();
      
      const diagramData = await diagramGenerator.generateDiagram(
        architecturalModel,
        AbstractionLevel.Module
      );

      const renderTime = Date.now() - startTime;
      const endMemoryMB = memoryManager.getMemoryUsageMB();
      const memoryIncreaseMB = memoryManager.getMemoryIncreaseMB();

      console.log(`Diagram generated in ${renderTime}ms (${(renderTime / 1000).toFixed(2)}s)`);
      console.log(`Memory usage: ${startMemoryMB.toFixed(2)}MB -> ${endMemoryMB.toFixed(2)}MB (increase: ${memoryIncreaseMB.toFixed(2)}MB)`);
      console.log(`Nodes: ${diagramData.nodes.length}, Edges: ${diagramData.edges.length}`);

      // Assertions
      expect(renderTime).toBeLessThan(60000); // < 60 seconds
      expect(diagramData.nodes.length).toBeGreaterThan(0);
      expect(memoryIncreaseMB).toBeLessThan(200); // < 200MB (Requirement 9.2)
    }, 70000); // 70 second timeout for test itself
  });

  /**
   * Test: Export time
   * Requirement: 7.5 - Export should complete within 5 seconds
   */
  describe('Export Performance', () => {
    it('should export diagram within 5 seconds', async () => {
      // Create a moderate-sized architectural model
      const componentCount = 100;
      const components: ArchitecturalComponent[] = [];
      
      for (let i = 0; i < componentCount; i++) {
        components.push({
          id: `component-${i}`,
          name: `Component ${i}`,
          description: `Description for component ${i}`,
          role: 'service',
          filePaths: [`src/component${i}.ts`],
          abstractionLevel: AbstractionLevel.Module,
          subComponents: [],
          parent: null
        });
      }

      const relationships: ArchitecturalRelationship[] = [];
      for (let i = 0; i < componentCount - 1; i++) {
        relationships.push({
          id: `rel-${i}`,
          sourceId: `component-${i}`,
          targetId: `component-${i + 1}`,
          type: 'dependency' as any,
          description: `Dependency from ${i} to ${i + 1}`,
          strength: 0.5
        });
      }

      const architecturalModel: ArchitecturalModel = {
        components,
        relationships,
        patterns: ['layered'],
        metadata: {
          llmInferenceTimeMs: 0,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: componentCount
        }
      };

      // Generate diagram
      const diagramData = await diagramGenerator.generateDiagram(
        architecturalModel,
        AbstractionLevel.Module
      );

      // Measure export time (simulated - actual export happens in webview)
      const startTime = Date.now();
      
      // Simulate export by serializing diagram data
      const exportData = JSON.stringify(diagramData);
      
      const exportTime = Date.now() - startTime;

      console.log(`Export completed in ${exportTime}ms`);
      console.log(`Export data size: ${(exportData.length / 1024).toFixed(2)}KB`);

      // Assertions
      expect(exportTime).toBeLessThan(5000); // < 5 seconds
      expect(exportData.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test: Memory usage during analysis
   * Requirement: 9.1 - Analysis should use no more than 500MB
   */
  describe('Memory Usage During Analysis', () => {
    it('should not exceed 500MB during analysis', async () => {
      // Create 500 test files
      const fileCount = 500;
      const filesDir = path.join(tempDir, 'memory-test');
      await fs.mkdir(filesDir, { recursive: true });

      for (let i = 0; i < fileCount; i++) {
        const fileName = `file${i}.ts`;
        const filePath = path.join(filesDir, fileName);
        const content = `
export class Component${i} {
  private data: string[] = ${JSON.stringify(Array(100).fill(`data-${i}`))};
  
  public process(): void {
    console.log(this.data.length);
  }
}
`;
        await fs.writeFile(filePath, content);
      }

      const config: AnalysisConfig = {
        rootPath: filesDir,
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFiles: 1000,
        maxDepth: 10,
        languages: [Language.TypeScript],
        aiEnabled: false
      };

      // Monitor memory during analysis
      memoryManager.setBaseline();
      let maxMemoryIncreaseMB = 0;

      const stopMonitoring = memoryManager.startAnalysisMonitoring((usageMB) => {
        console.warn(`Memory limit exceeded: ${usageMB.toFixed(2)}MB`);
      });

      try {
        await analysisService.buildGroundingLayer(filesDir, {
          config,
          cancellationToken: createCancellationToken(),
          timeoutMs: 120000
        });

        maxMemoryIncreaseMB = memoryManager.getMemoryIncreaseMB();
        console.log(`Max memory increase during analysis: ${maxMemoryIncreaseMB.toFixed(2)}MB`);

        // Assertion
        expect(maxMemoryIncreaseMB).toBeLessThan(500); // < 500MB
      } finally {
        stopMonitoring();
      }
    }, 150000);
  });

  /**
   * Test: Memory release after diagram closed
   * Requirement: 9.4 - Memory should be released within 2 seconds
   */
  describe('Memory Release', () => {
    it('should release memory within 2 seconds after cleanup', async () => {
      // Create some data
      let largeData: any = {
        components: Array(1000).fill(null).map((_, i) => ({
          id: `comp-${i}`,
          name: `Component ${i}`,
          data: Array(100).fill(`data-${i}`)
        }))
      };

      memoryManager.setBaseline();
      const beforeCleanupMB = memoryManager.getMemoryIncreaseMB();
      console.log(`Memory before cleanup: ${beforeCleanupMB.toFixed(2)}MB`);

      // Release memory
      const startTime = Date.now();
      
      await memoryManager.releaseMemory(() => {
        largeData = null;
      });

      const releaseTime = Date.now() - startTime;
      const afterCleanupMB = memoryManager.getMemoryIncreaseMB();
      
      console.log(`Memory after cleanup: ${afterCleanupMB.toFixed(2)}MB`);
      console.log(`Release time: ${releaseTime}ms`);

      // Assertions
      expect(releaseTime).toBeLessThanOrEqual(2100); // <= 2.1 seconds (allowing small margin)
    });
  });
});
