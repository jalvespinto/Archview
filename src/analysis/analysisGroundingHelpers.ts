import * as path from 'path';
import * as crypto from 'crypto';
import { AnalysisConfig, Component, ComponentType, Relationship, RelationshipType } from '../types';
import {
  ClassGroundingData,
  DirectoryNode,
  FileGroundingData,
  FunctionGroundingData,
  ImportEdge,
  InheritanceEdge
} from '../types/analysis';
import { Language } from '../types';

export function findModuleComponentForFile(
  filePath: string,
  components: Component[]
): Component | undefined {
  return components.find(
    (component) =>
      component.filePaths.includes(filePath) &&
      (component.type === ComponentType.Module || component.type === ComponentType.Package)
  );
}

export function createEmptyGroundingDataForFile(
  filePath: string,
  language: Language
): FileGroundingData {
  return {
    path: filePath,
    language,
    exports: [],
    classes: [],
    topLevelFunctions: [],
    imports: []
  };
}

export function buildFileGroundingDataFromComponents(
  filePath: string,
  language: Language,
  components: Component[]
): FileGroundingData {
  const moduleComponent = findModuleComponentForFile(filePath, components);
  if (!moduleComponent) {
    return createEmptyGroundingDataForFile(filePath, language);
  }

  const exports: string[] = [];
  const classes: ClassGroundingData[] = [];
  const topLevelFunctions: FunctionGroundingData[] = [];

  if (moduleComponent.metadata.exportedSymbols) {
    exports.push(...moduleComponent.metadata.exportedSymbols);
  }

  collectModuleClassGroundingData(moduleComponent.id, components, classes, exports);
  collectModuleTopLevelFunctions(moduleComponent.id, components, topLevelFunctions, exports);
  collectInterfaceExportNames(moduleComponent.id, components, exports);

  return {
    path: filePath,
    language,
    exports,
    classes,
    topLevelFunctions,
    imports: []
  };
}

export function collectInterfaceExportNames(
  moduleComponentId: string,
  components: Component[],
  exports: string[]
): void {
  const moduleInterfaces = components.filter(
    (component) => component.type === ComponentType.Interface && component.parent === moduleComponentId
  );
  for (const interfaceComponent of moduleInterfaces) {
    exports.push(interfaceComponent.name);
  }
}

export function collectModuleClassGroundingData(
  moduleComponentId: string,
  components: Component[],
  classes: ClassGroundingData[],
  exports: string[]
): void {
  const moduleClasses = components.filter(
    (component) => component.type === ComponentType.Class && component.parent === moduleComponentId
  );
  for (const classComponent of moduleClasses) {
    const methods = components
      .filter((component) => component.parent === classComponent.id && component.type === ComponentType.Function)
      .map((methodComponent) => methodComponent.name.split('.').pop() || methodComponent.name);

    classes.push({
      name: classComponent.name,
      superClass: undefined,
      interfaces: [],
      methods
    });
    exports.push(classComponent.name);
  }
}

export function collectModuleTopLevelFunctions(
  moduleComponentId: string,
  components: Component[],
  topLevelFunctions: FunctionGroundingData[],
  exports: string[]
): void {
  const moduleFunctions = components.filter(
    (component) => component.type === ComponentType.Function && component.parent === moduleComponentId
  );
  for (const functionComponent of moduleFunctions) {
    topLevelFunctions.push({ name: functionComponent.name });
    exports.push(functionComponent.name);
  }
}

export function buildDirectoryTreeFromFilePaths(rootPath: string, filePaths: string[]): DirectoryNode {
  const root: DirectoryNode = {
    name: path.basename(rootPath),
    path: '',
    children: [],
    files: []
  };

  for (const filePath of filePaths) {
    const parts = filePath.split(path.sep);
    let currentNode = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      let childNode = currentNode.children.find((child) => child.name === dirName);

      if (!childNode) {
        childNode = {
          name: dirName,
          path: parts.slice(0, i + 1).join(path.sep),
          children: [],
          files: []
        };
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }

    currentNode.files.push(filePath);
  }

  return root;
}

export function buildImportGraphEdges(
  relationships: Relationship[],
  components: Component[]
): ImportEdge[] {
  const importEdges: ImportEdge[] = [];
  const componentMap = new Map(components.map((component) => [component.id, component]));

  for (const relationship of relationships) {
    if (relationship.type === RelationshipType.Import || relationship.type === RelationshipType.Dependency) {
      const sourceComponent = componentMap.get(relationship.source);
      const targetComponent = componentMap.get(relationship.target);

      if (
        sourceComponent &&
        targetComponent &&
        sourceComponent.filePaths[0] &&
        targetComponent.filePaths[0]
      ) {
        importEdges.push({
          sourceFile: sourceComponent.filePaths[0],
          targetFile: targetComponent.filePaths[0],
          symbols: []
        });
      }
    }
  }

  return importEdges;
}

export function buildInheritanceGraphEdges(
  relationships: Relationship[],
  components: Component[]
): InheritanceEdge[] {
  const inheritanceEdges: InheritanceEdge[] = [];
  const componentMap = new Map(components.map((component) => [component.id, component]));

  for (const relationship of relationships) {
    if (relationship.type === RelationshipType.Inheritance) {
      const sourceComponent = componentMap.get(relationship.source);
      const targetComponent = componentMap.get(relationship.target);

      if (sourceComponent && targetComponent && sourceComponent.filePaths[0]) {
        inheritanceEdges.push({
          childClass: sourceComponent.name,
          parentClass: targetComponent.name,
          sourceFile: sourceComponent.filePaths[0],
          type: 'extends'
        });
      }
    }
  }

  return inheritanceEdges;
}

export function generateAnalysisCacheKey(rootPath: string, config: AnalysisConfig): string {
  const configStr = JSON.stringify({
    includePatterns: config.includePatterns.sort(),
    excludePatterns: config.excludePatterns.sort(),
    maxFiles: config.maxFiles,
    maxDepth: config.maxDepth,
    languages: config.languages.sort()
  });

  return crypto.createHash('md5').update(rootPath + configStr).digest('hex');
}

export function getTimedOutElapsedMs(startTime: number, timeoutMs: number): number | null {
  const elapsed = Date.now() - startTime;
  if (elapsed > timeoutMs) {
    return elapsed;
  }
  return null;
}

export function isAnalysisCancelled(token?: { isCancelled: boolean }): boolean {
  return Boolean(token?.isCancelled);
}

export function buildCancellationTokenState(): { isCancelled: boolean; cancel: () => void } {
  return {
    isCancelled: false,
    cancel() {
      this.isCancelled = true;
    }
  };
}

export function getProgressUpdateTimestamp(
  now: number,
  lastProgressUpdate: number,
  progressUpdateIntervalMs: number,
  percentage: number
): number | null {
  if (now - lastProgressUpdate >= progressUpdateIntervalMs || percentage === 100) {
    return now;
  }
  return null;
}

export function cacheEntryMatchesFilePath(
  cachedPaths: Iterable<string>,
  rootPath: string,
  filePath: string
): boolean {
  const normalizedInput = path.normalize(filePath);
  return Array.from(cachedPaths).some((cachedPath) => {
    if (path.normalize(cachedPath) === normalizedInput) {
      return true;
    }

    const absoluteCachedPath = path.normalize(path.join(rootPath, cachedPath));
    return absoluteCachedPath === normalizedInput;
  });
}

export function formatBuildGroundingLayerError(error: unknown): string {
  return `Failed to build grounding layer: ${error instanceof Error ? error.message : String(error)}`;
}

export interface FileProgressUpdate {
  percentage: number;
  message: string;
}

export function buildFileProcessingProgressUpdate(
  index: number,
  totalFiles: number,
  filePath: string
): FileProgressUpdate | null {
  if (index % Math.max(1, Math.floor(totalFiles / 10)) !== 0) {
    return null;
  }

  return {
    percentage: 10 + Math.floor((index / totalFiles) * 60),
    message: `Processing file ${index + 1}/${totalFiles}: ${filePath}`
  };
}

export async function isCachedFileEntryStale(
  rootPath: string,
  filePath: string,
  cachedModTime: number,
  statFile: (absolutePath: string) => Promise<{ mtimeMs: number }>
): Promise<boolean> {
  try {
    const absolutePath = path.join(rootPath, filePath);
    const stats = await statFile(absolutePath);
    return stats.mtimeMs !== cachedModTime;
  } catch {
    return true;
  }
}

export async function collectFileModificationTimes(
  rootPath: string,
  filePaths: string[],
  statFile: (absolutePath: string) => Promise<{ mtimeMs: number }>
): Promise<Map<string, number>> {
  const fileModTimes = new Map<string, number>();
  for (const filePath of filePaths) {
    try {
      const stats = await statFile(filePath);
      const relativePath = path.relative(rootPath, filePath);
      fileModTimes.set(relativePath, stats.mtimeMs);
    } catch {
      // Skip files that can't be stat'd
    }
  }
  return fileModTimes;
}
