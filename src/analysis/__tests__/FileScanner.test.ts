/**
 * Unit tests for FileScanner
 * Tests file system scanning, language detection, and pattern filtering
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileScanner, ScanOptions } from '../FileScanner';
import { Language } from '../../types';

// Mock fs module
jest.mock('fs/promises');

describe('FileScanner', () => {
  let scanner: FileScanner;
  const mockFs = fs as jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    scanner = new FileScanner();
    jest.clearAllMocks();
  });
  
  describe('detectLanguage', () => {
    it('should detect Python files', () => {
      expect(scanner.detectLanguage('script.py')).toBe(Language.Python);
      expect(scanner.detectLanguage('module.pyw')).toBe(Language.Python);
      expect(scanner.detectLanguage('types.pyi')).toBe(Language.Python);
    });
    
    it('should detect JavaScript files', () => {
      expect(scanner.detectLanguage('app.js')).toBe(Language.JavaScript);
      expect(scanner.detectLanguage('component.jsx')).toBe(Language.JavaScript);
      expect(scanner.detectLanguage('module.mjs')).toBe(Language.JavaScript);
      expect(scanner.detectLanguage('config.cjs')).toBe(Language.JavaScript);
    });
    
    it('should detect TypeScript files', () => {
      expect(scanner.detectLanguage('app.ts')).toBe(Language.TypeScript);
      expect(scanner.detectLanguage('component.tsx')).toBe(Language.TypeScript);
      expect(scanner.detectLanguage('module.mts')).toBe(Language.TypeScript);
      expect(scanner.detectLanguage('config.cts')).toBe(Language.TypeScript);
    });
    
    it('should detect Java files', () => {
      expect(scanner.detectLanguage('Main.java')).toBe(Language.Java);
    });
    
    it('should detect Go files', () => {
      expect(scanner.detectLanguage('main.go')).toBe(Language.Go);
    });
    
    it('should return Unknown for unsupported extensions', () => {
      expect(scanner.detectLanguage('readme.md')).toBe(Language.Unknown);
      expect(scanner.detectLanguage('config.json')).toBe(Language.Unknown);
      expect(scanner.detectLanguage('style.css')).toBe(Language.Unknown);
    });
    
    it('should be case-insensitive', () => {
      expect(scanner.detectLanguage('Script.PY')).toBe(Language.Python);
      expect(scanner.detectLanguage('App.TS')).toBe(Language.TypeScript);
    });
  });
  
  describe('scan', () => {
    const defaultOptions: ScanOptions = {
      includePatterns: [],
      excludePatterns: [],
      maxFiles: 1000,
      maxDepth: 10,
      respectGitignore: false,
    };
    
    it('should scan a simple directory structure', async () => {
      const rootPath = '/project';
      
      // Mock directory structure
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
            { name: 'utils.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, defaultOptions);
      
      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe('main.py');
      expect(result.files[0].language).toBe(Language.Python);
      expect(result.files[1].path).toBe('utils.py');
      expect(result.totalFiles).toBe(2);
    });
    
    it('should scan nested directories', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'src', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'src')) {
          return [
            { name: 'index.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, defaultOptions);
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toContain('src');
      expect(result.files[0].language).toBe(Language.TypeScript);
      expect(result.files[0].depth).toBe(1);
    });
    
    it('should respect maxFiles limit', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'file1.py', isFile: () => true, isDirectory: () => false },
            { name: 'file2.py', isFile: () => true, isDirectory: () => false },
            { name: 'file3.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        maxFiles: 2,
      });
      
      expect(result.files.length).toBeLessThanOrEqual(2);
    });
    
    it('should respect maxDepth limit', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'level1', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'level1')) {
          return [
            { name: 'level2', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'level1', 'level2')) {
          return [
            { name: 'deep.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        maxDepth: 1,
      });
      
      expect(result.maxDepthReached).toBe(true);
      expect(result.files.every(f => f.depth <= 1)).toBe(true);
    });
    
    it('should exclude default patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'node_modules', isFile: () => false, isDirectory: () => true },
            { name: 'src', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'node_modules')) {
          return [
            { name: 'package.js', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'src')) {
          return [
            { name: 'index.js', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, defaultOptions);
      
      // Should only include src/index.js, not node_modules/package.js
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toContain('src');
      expect(result.skippedFiles).toBeGreaterThan(0);
    });
    
    it('should apply custom exclude patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
            { name: 'test.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        excludePatterns: ['**/test.py'],
      });
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('main.py');
    });
    
    it('should apply include patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
            { name: 'app.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        includePatterns: ['**/*.py'],
      });
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('main.py');
    });
    
    it('should skip unknown file types', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
            { name: 'readme.md', isFile: () => true, isDirectory: () => false },
            { name: 'config.json', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, defaultOptions);
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('main.py');
      expect(result.totalFiles).toBe(3);
      expect(result.skippedFiles).toBe(2);
    });
    
    it('should handle inaccessible directories gracefully', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'accessible', isFile: () => false, isDirectory: () => true },
            { name: 'restricted', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'accessible')) {
          return [
            { name: 'file.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'restricted')) {
          throw new Error('EACCES: permission denied');
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, defaultOptions);
      
      // Should continue scanning despite error
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toContain('accessible');
    });
    
    it('should load and respect .gitignore patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readFile.mockResolvedValue('*.log\ntemp/\n# comment\n\n');
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
            { name: 'debug.log', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        respectGitignore: true,
      });
      
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(rootPath, '.gitignore'),
        'utf-8'
      );
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('main.py');
    });
    
    it('should handle missing .gitignore gracefully', async () => {
      const rootPath = '/project';
      
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'main.py', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        respectGitignore: true,
      });
      
      // Should continue without .gitignore
      expect(result.files).toHaveLength(1);
    });
  });
  
  describe('glob pattern matching', () => {
    const defaultOptions: ScanOptions = {
      includePatterns: [],
      excludePatterns: [],
      maxFiles: 1000,
      maxDepth: 10,
      respectGitignore: false,
    };
    
    it('should match wildcard patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'test.spec.ts', isFile: () => true, isDirectory: () => false },
            { name: 'main.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        excludePatterns: ['*.spec.ts'],
      });
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toBe('main.ts');
    });
    
    it('should match double-star patterns', async () => {
      const rootPath = '/project';
      
      mockFs.readdir.mockImplementation(async (dirPath: any) => {
        if (dirPath === rootPath) {
          return [
            { name: 'tests', isFile: () => false, isDirectory: () => true },
            { name: 'src', isFile: () => false, isDirectory: () => true },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'tests')) {
          return [
            { name: 'unit.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        if (dirPath === path.join(rootPath, 'src')) {
          return [
            { name: 'main.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      
      const result = await scanner.scan(rootPath, {
        ...defaultOptions,
        excludePatterns: ['**/tests/**'],
      });
      
      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toContain('src');
    });
  });
});
