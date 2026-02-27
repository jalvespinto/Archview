/**
 * Unit tests for ComponentExtractor
 * Tests component extraction from various language ASTs
 */

import { ComponentExtractor, ExtractionContext } from '../ComponentExtractor';
import { ParserManager, ParsedAST } from '../ParserManager';
import { Language, ComponentType, AbstractionLevel } from '../../types';

describe('ComponentExtractor', () => {
  let extractor: ComponentExtractor;
  let parserManager: ParserManager;

  beforeEach(async () => {
    extractor = new ComponentExtractor();
    parserManager = new ParserManager();
    await parserManager.initialize();
    extractor.resetIdCounter();
  });

  afterEach(() => {
    parserManager.dispose();
  });

  describe('Python component extraction', () => {
    it('should extract module, class, and methods from Python file', async () => {
      const sourceCode = `
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b

def multiply(a, b):
    return a * b
`;

      const ast = await parserManager.parseFile(
        '/test/calculator.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/calculator.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have module, class, 2 methods, and 1 function
      expect(result.components).toHaveLength(5);

      // Check module component
      const module = result.components[0];
      expect(module.type).toBe(ComponentType.Module);
      expect(module.name).toBe('calculator');
      expect(module.abstractionLevel).toBe(AbstractionLevel.Overview);
      expect(module.parent).toBeNull();

      // Check class component
      const classComp = result.components.find(c => c.type === ComponentType.Class);
      expect(classComp).toBeDefined();
      expect(classComp!.name).toBe('Calculator');
      expect(classComp!.abstractionLevel).toBe(AbstractionLevel.Module);
      expect(classComp!.parent).toBe(module.id);

      // Check methods
      const methods = result.components.filter(
        c => c.type === ComponentType.Function && c.parent === classComp!.id
      );
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name).sort()).toEqual(['Calculator.add', 'Calculator.subtract']);
      methods.forEach(m => {
        expect(m.abstractionLevel).toBe(AbstractionLevel.Detailed);
      });

      // Check top-level function
      const func = result.components.find(
        c => c.type === ComponentType.Function && c.name === 'multiply'
      );
      expect(func).toBeDefined();
      expect(func!.abstractionLevel).toBe(AbstractionLevel.Module);
      expect(func!.parent).toBe(module.id);
    });

    it('should handle Python file with only functions', async () => {
      const sourceCode = `
def func1():
    pass

def func2():
    pass
`;

      const ast = await parserManager.parseFile(
        '/test/utils.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/utils.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have module and 2 functions
      expect(result.components).toHaveLength(3);

      const module = result.components[0];
      expect(module.type).toBe(ComponentType.Module);

      const functions = result.components.filter(c => c.type === ComponentType.Function);
      expect(functions).toHaveLength(2);
      expect(functions.map(f => f.name).sort()).toEqual(['func1', 'func2']);
    });
  });

  describe('JavaScript/TypeScript component extraction', () => {
    it('should extract module, class, and methods from JavaScript file', async () => {
      const sourceCode = `
class UserService {
  getUser(id) {
    return { id };
  }
  
  createUser(data) {
    return data;
  }
}

function validateUser(user) {
  return user !== null;
}
`;

      const ast = await parserManager.parseFile(
        '/test/service.js',
        sourceCode,
        Language.JavaScript
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/service.js',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have module, class, 2 methods, and 1 function
      expect(result.components).toHaveLength(5);

      const module = result.components[0];
      expect(module.type).toBe(ComponentType.Module);
      expect(module.language).toBe(Language.JavaScript);

      const classComp = result.components.find(c => c.type === ComponentType.Class);
      expect(classComp).toBeDefined();
      expect(classComp!.name).toBe('UserService');

      const methods = result.components.filter(
        c => c.type === ComponentType.Function && c.parent === classComp!.id
      );
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name).sort()).toEqual(['UserService.createUser', 'UserService.getUser']);
    });

    it('should extract interfaces from TypeScript file', async () => {
      const sourceCode = `
interface User {
  id: number;
  name: string;
}

interface Product {
  id: number;
  price: number;
}

class UserManager {
  getUser(id: number): User {
    return { id, name: 'test' };
  }
}
`;

      const ast = await parserManager.parseFile(
        '/test/types.ts',
        sourceCode,
        Language.TypeScript
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/types.ts',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have module, 2 interfaces, 1 class, 1 method
      expect(result.components.length).toBeGreaterThanOrEqual(4);

      const interfaces = result.components.filter(c => c.type === ComponentType.Interface);
      expect(interfaces).toHaveLength(2);
      expect(interfaces.map(i => i.name).sort()).toEqual(['Product', 'User']);
      interfaces.forEach(i => {
        expect(i.abstractionLevel).toBe(AbstractionLevel.Module);
      });
    });
  });

  describe('Java component extraction', () => {
    it('should extract package, class, and methods from Java file', async () => {
      const sourceCode = `
package com.example.app;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
}
`;

      const ast = await parserManager.parseFile(
        '/test/Calculator.java',
        sourceCode,
        Language.Java
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/Calculator.java',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have package, class, and 2 methods
      expect(result.components).toHaveLength(4);

      const pkg = result.components[0];
      expect(pkg.type).toBe(ComponentType.Package);
      expect(pkg.name).toBe('com.example.app');
      expect(pkg.abstractionLevel).toBe(AbstractionLevel.Overview);

      const classComp = result.components.find(c => c.type === ComponentType.Class);
      expect(classComp).toBeDefined();
      expect(classComp!.name).toBe('Calculator');
      expect(classComp!.parent).toBe(pkg.id);

      const methods = result.components.filter(
        c => c.type === ComponentType.Function && c.parent === classComp!.id
      );
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.name).sort()).toEqual(['Calculator.add', 'Calculator.subtract']);
    });

    it('should extract interfaces from Java file', async () => {
      const sourceCode = `
package com.example;

public interface Drawable {
    void draw();
}

public interface Resizable {
    void resize(int width, int height);
}
`;

      const ast = await parserManager.parseFile(
        '/test/Interfaces.java',
        sourceCode,
        Language.Java
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/Interfaces.java',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      const interfaces = result.components.filter(c => c.type === ComponentType.Interface);
      expect(interfaces).toHaveLength(2);
      expect(interfaces.map(i => i.name).sort()).toEqual(['Drawable', 'Resizable']);
    });
  });

  describe('Go component extraction', () => {
    it('should extract package, struct, and methods from Go file', async () => {
      const sourceCode = `
package calculator

type Calculator struct {
    value int
}

func (c *Calculator) Add(a int, b int) int {
    return a + b
}

func (c Calculator) Subtract(a int, b int) int {
    return a - b
}

func Multiply(a int, b int) int {
    return a * b
}
`;

      const ast = await parserManager.parseFile(
        '/test/calculator.go',
        sourceCode,
        Language.Go
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/calculator.go',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should have package, struct, 2 methods, and 1 function
      expect(result.components.length).toBeGreaterThanOrEqual(4);

      const pkg = result.components[0];
      expect(pkg.type).toBe(ComponentType.Package);
      expect(pkg.name).toBe('calculator');
      expect(pkg.abstractionLevel).toBe(AbstractionLevel.Overview);

      const structComp = result.components.find(c => c.type === ComponentType.Class);
      expect(structComp).toBeDefined();
      expect(structComp!.name).toBe('Calculator');

      // Check for methods (should have Calculator receiver)
      const methods = result.components.filter(
        c => c.name.startsWith('Calculator.') && c.type === ComponentType.Function
      );
      expect(methods.length).toBeGreaterThanOrEqual(2);

      // Check for top-level function
      const func = result.components.find(c => c.name === 'Multiply');
      expect(func).toBeDefined();
      expect(func!.abstractionLevel).toBe(AbstractionLevel.Module);
    });

    it('should handle Go file with only functions', async () => {
      const sourceCode = `
package utils

func Helper1() {
}

func Helper2() {
}
`;

      const ast = await parserManager.parseFile(
        '/test/utils.go',
        sourceCode,
        Language.Go
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/utils.go',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      const pkg = result.components[0];
      expect(pkg.type).toBe(ComponentType.Package);
      expect(pkg.name).toBe('utils');

      const functions = result.components.filter(c => c.type === ComponentType.Function);
      expect(functions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Abstraction level assignment', () => {
    it('should assign correct abstraction levels', async () => {
      const sourceCode = `
class Outer:
    def method1(self):
        pass
    
    def method2(self):
        pass

def top_level_func():
    pass
`;

      const ast = await parserManager.parseFile(
        '/test/levels.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/levels.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Module should be Overview (level 1)
      const module = result.components.find(c => c.type === ComponentType.Module);
      expect(module!.abstractionLevel).toBe(AbstractionLevel.Overview);

      // Class should be Module (level 2)
      const classComp = result.components.find(c => c.type === ComponentType.Class);
      expect(classComp!.abstractionLevel).toBe(AbstractionLevel.Module);

      // Methods should be Detailed (level 3)
      const methods = result.components.filter(
        c => c.name.startsWith('Outer.') && c.type === ComponentType.Function
      );
      methods.forEach(m => {
        expect(m.abstractionLevel).toBe(AbstractionLevel.Detailed);
      });

      // Top-level function should be Module (level 2)
      const func = result.components.find(c => c.name === 'top_level_func');
      expect(func!.abstractionLevel).toBe(AbstractionLevel.Module);
    });
  });

  describe('Parent-child relationships', () => {
    it('should establish correct parent-child relationships', async () => {
      const sourceCode = `
class Parent:
    def child_method(self):
        pass
`;

      const ast = await parserManager.parseFile(
        '/test/hierarchy.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/hierarchy.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      const module = result.components[0];
      const classComp = result.components.find(c => c.type === ComponentType.Class);
      const method = result.components.find(c => c.name === 'Parent.child_method');

      // Module should have class as child
      expect(module.children).toContain(classComp!.id);

      // Class should have method as child
      expect(classComp!.children).toContain(method!.id);

      // Class parent should be module
      expect(classComp!.parent).toBe(module.id);

      // Method parent should be class
      expect(method!.parent).toBe(classComp!.id);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty file', async () => {
      const sourceCode = '';

      const ast = await parserManager.parseFile(
        '/test/empty.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/empty.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should still create module component
      expect(result.components).toHaveLength(1);
      expect(result.components[0].type).toBe(ComponentType.Module);
    });

    it('should handle unknown language', async () => {
      const sourceCode = 'some random text';

      const ast = await parserManager.parseFile(
        '/test/unknown.txt',
        sourceCode,
        Language.Unknown
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/unknown.txt',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should return empty components for unknown language
      expect(result.components).toHaveLength(0);
    });

    it('should handle file with parse errors gracefully', async () => {
      const sourceCode = `
class Broken
    def incomplete(self
`;

      const ast = await parserManager.parseFile(
        '/test/broken.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/test',
        filePath: '/test/broken.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      // Should still attempt extraction despite errors
      expect(result.components.length).toBeGreaterThanOrEqual(1);
      expect(result.components[0].type).toBe(ComponentType.Module);
    });
  });

  describe('Module naming', () => {
    it('should generate correct module names from file paths', async () => {
      const sourceCode = 'def test(): pass';

      const ast = await parserManager.parseFile(
        '/project/src/utils/helpers.py',
        sourceCode,
        Language.Python
      );

      const context: ExtractionContext = {
        rootPath: '/project',
        filePath: '/project/src/utils/helpers.py',
        ast,
        parserManager
      };

      const result = await extractor.extractComponents(context);

      const module = result.components[0];
      expect(module.name).toBe('src.utils.helpers');
    });
  });
});
