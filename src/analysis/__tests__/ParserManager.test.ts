/**
 * Unit tests for ParserManager
 * Tests parser initialization, file parsing, AST traversal, and error handling
 */

import { ParserManager, ParsedAST, TraversalOptions } from '../ParserManager';
import { Language } from '../../types';

describe('ParserManager', () => {
  let parserManager: ParserManager;

  beforeEach(() => {
    parserManager = new ParserManager();
  });

  afterEach(() => {
    parserManager.dispose();
  });

  describe('Initialization', () => {
    it('should initialize parsers for all supported languages', async () => {
      await parserManager.initialize();
      // If initialization succeeds, we should be able to parse files
      const result = await parserManager.parseFile(
        'test.py',
        'x = 1',
        Language.Python
      );
      expect(result.tree).toBeDefined();
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await parserManager.initialize();
      await parserManager.initialize(); // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Python Parsing', () => {
    it('should parse valid Python code', async () => {
      const sourceCode = `
def hello():
    print("Hello, World!")

class MyClass:
    def method(self):
        pass
`;
      const result = await parserManager.parseFile(
        'test.py',
        sourceCode,
        Language.Python
      );

      expect(result.language).toBe(Language.Python);
      expect(result.filePath).toBe('test.py');
      expect(result.tree).toBeDefined();
      expect(result.tree.rootNode).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(false);
    });

    it('should extract function definitions from Python', async () => {
      const sourceCode = `
def function_one():
    pass

def function_two(arg1, arg2):
    return arg1 + arg2
`;
      const result = await parserManager.parseFile(
        'test.py',
        sourceCode,
        Language.Python
      );

      const functions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_definition']
      });

      expect(functions.length).toBeGreaterThanOrEqual(2);
      expect(functions.some(f => f.text.includes('function_one'))).toBe(true);
      expect(functions.some(f => f.text.includes('function_two'))).toBe(true);
    });

    it('should extract class definitions from Python', async () => {
      const sourceCode = `
class FirstClass:
    def method(self):
        pass

class SecondClass(FirstClass):
    pass
`;
      const result = await parserManager.parseFile(
        'test.py',
        sourceCode,
        Language.Python
      );

      const classes = parserManager.extractNodesByType(result, {
        nodeTypes: ['class_definition']
      });

      expect(classes.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle Python parse errors gracefully', async () => {
      const invalidCode = `
def broken_function(
    # Missing closing parenthesis and body
`;
      const result = await parserManager.parseFile(
        'test.py',
        invalidCode,
        Language.Python
      );

      expect(result.tree).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(true);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });
  });

  describe('JavaScript Parsing', () => {
    it('should parse valid JavaScript code', async () => {
      const sourceCode = `
function greet(name) {
  return \`Hello, \${name}!\`;
}

const arrow = () => {
  console.log('Arrow function');
};
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      expect(result.language).toBe(Language.JavaScript);
      expect(result.tree).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(false);
    });

    it('should extract function declarations from JavaScript', async () => {
      const sourceCode = `
function regularFunction() {
  return 42;
}

const arrowFunction = () => {
  return 'arrow';
};
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const functions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_declaration', 'arrow_function']
      });

      expect(functions.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract class declarations from JavaScript', async () => {
      const sourceCode = `
class MyClass {
  constructor() {
    this.value = 0;
  }
  
  method() {
    return this.value;
  }
}
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const classes = parserManager.extractNodesByType(result, {
        nodeTypes: ['class_declaration']
      });

      expect(classes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TypeScript Parsing', () => {
    it('should parse valid TypeScript code', async () => {
      const sourceCode = `
interface User {
  name: string;
  age: number;
}

class UserService {
  getUser(id: number): User {
    return { name: 'Test', age: 30 };
  }
}
`;
      const result = await parserManager.parseFile(
        'test.ts',
        sourceCode,
        Language.TypeScript
      );

      expect(result.language).toBe(Language.TypeScript);
      expect(result.tree).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(false);
    });

    it('should extract interfaces from TypeScript', async () => {
      const sourceCode = `
interface IService {
  execute(): void;
}

interface IRepository<T> {
  find(id: string): T;
}
`;
      const result = await parserManager.parseFile(
        'test.ts',
        sourceCode,
        Language.TypeScript
      );

      const interfaces = parserManager.extractNodesByType(result, {
        nodeTypes: ['interface_declaration']
      });

      expect(interfaces.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Java Parsing', () => {
    it('should parse valid Java code', async () => {
      const sourceCode = `
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`;
      const result = await parserManager.parseFile(
        'HelloWorld.java',
        sourceCode,
        Language.Java
      );

      expect(result.language).toBe(Language.Java);
      expect(result.tree).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(false);
    });

    it('should extract class declarations from Java', async () => {
      const sourceCode = `
public class FirstClass {
    private int value;
}

class SecondClass extends FirstClass {
    public void method() {}
}
`;
      const result = await parserManager.parseFile(
        'Test.java',
        sourceCode,
        Language.Java
      );

      const classes = parserManager.extractNodesByType(result, {
        nodeTypes: ['class_declaration']
      });

      expect(classes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Go Parsing', () => {
    it('should parse valid Go code', async () => {
      const sourceCode = `
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`;
      const result = await parserManager.parseFile(
        'main.go',
        sourceCode,
        Language.Go
      );

      expect(result.language).toBe(Language.Go);
      expect(result.tree).toBeDefined();
      expect(parserManager.hasErrors(result)).toBe(false);
    });

    it('should extract function declarations from Go', async () => {
      const sourceCode = `
package main

func add(a int, b int) int {
    return a + b
}

func multiply(a, b int) int {
    return a * b
}
`;
      const result = await parserManager.parseFile(
        'math.go',
        sourceCode,
        Language.Go
      );

      const functions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_declaration']
      });

      expect(functions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('AST Traversal', () => {
    it('should respect maxDepth option', async () => {
      const sourceCode = `
class Outer {
  method() {
    function inner() {
      const x = 1;
    }
  }
}
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const nodesDepth1 = parserManager.extractNodesByType(result, {
        maxDepth: 1
      });

      const nodesDepth5 = parserManager.extractNodesByType(result, {
        maxDepth: 5
      });

      expect(nodesDepth5.length).toBeGreaterThan(nodesDepth1.length);
    });

    it('should filter by node types', async () => {
      const sourceCode = `
function foo() {}
function bar() {}
class Baz {}
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const onlyClasses = parserManager.extractNodesByType(result, {
        nodeTypes: ['class_declaration']
      });

      const onlyFunctions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_declaration']
      });

      expect(onlyClasses.length).toBe(1);
      expect(onlyFunctions.length).toBe(2);
      expect(onlyClasses.length).not.toBe(onlyFunctions.length);
    });

    it('should get named children of a node', async () => {
      const sourceCode = `
class MyClass {
  method1() {}
  method2() {}
}
`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const classes = parserManager.extractNodesByType(result, {
        nodeTypes: ['class_declaration']
      });

      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(classes[0].children.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown language gracefully', async () => {
      const result = await parserManager.parseFile(
        'test.unknown',
        'some code',
        Language.Unknown
      );

      expect(result.language).toBe(Language.Unknown);
      expect(result.parseErrors.length).toBeGreaterThan(0);
      expect(result.parseErrors[0].message).toContain('Unknown language');
    });

    it('should handle empty source code', async () => {
      const result = await parserManager.parseFile(
        'empty.py',
        '',
        Language.Python
      );

      expect(result.tree).toBeDefined();
      expect(result.sourceCode).toBe('');
    });

    it('should detect parse errors in malformed code', async () => {
      const malformedCode = `
function broken {
  this is not valid syntax !!!
  {{{{
`;
      const result = await parserManager.parseFile(
        'broken.js',
        malformedCode,
        Language.JavaScript
      );

      expect(parserManager.hasErrors(result)).toBe(true);
    });

    it('should provide partial results even with parse errors', async () => {
      const partiallyValidCode = `
function validFunction() {
  return 42;
}

function brokenFunction( {
  // Missing closing paren
`;
      const result = await parserManager.parseFile(
        'partial.js',
        partiallyValidCode,
        Language.JavaScript
      );

      // Should still be able to extract the valid function
      const functions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_declaration']
      });

      expect(functions.length).toBeGreaterThanOrEqual(1);
      expect(parserManager.hasErrors(result)).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should get node text correctly', async () => {
      const sourceCode = `function test() { return 42; }`;
      const result = await parserManager.parseFile(
        'test.js',
        sourceCode,
        Language.JavaScript
      );

      const functions = parserManager.extractNodesByType(result, {
        nodeTypes: ['function_declaration']
      });

      expect(functions.length).toBeGreaterThanOrEqual(1);
      expect(functions[0].text).toContain('test');
      expect(functions[0].text).toContain('42');
    });

    it('should dispose resources properly', async () => {
      await parserManager.initialize();
      parserManager.dispose();
      
      // After disposal, should reinitialize on next parse
      const result = await parserManager.parseFile(
        'test.py',
        'x = 1',
        Language.Python
      );
      
      expect(result.tree).toBeDefined();
    });
  });
});
