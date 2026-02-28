/**
 * FileMappingService - Maintains element-to-files associations
 * Requirements: 3.2, 3.3
 */

import { DiagramData, DiagramNode } from '../types';

/**
 * FileMappingService maintains the mapping between diagram elements and their source files
 * Implements Requirements 3.2, 3.3
 */
export class FileMappingService {
  private elementToFilesMap: Map<string, string[]> = new Map();
  private fileToElementsMap: Map<string, string[]> = new Map();

  /**
   * Update mappings from diagram data
   * 
   * @param diagramData - The diagram data containing nodes with file paths
   */
  updateMappings(diagramData: DiagramData): void {
    // Clear existing mappings
    this.elementToFilesMap.clear();
    this.fileToElementsMap.clear();

    // Build new mappings from diagram nodes
    for (const node of diagramData.nodes) {
      this.addElementMapping(node.id, node.filePaths);
    }
  }

  /**
   * Add mapping for a single element
   * 
   * @param elementId - The diagram element ID
   * @param filePaths - Array of file paths associated with this element
   */
  private addElementMapping(elementId: string, filePaths: string[]): void {
    // Store element -> files mapping
    this.elementToFilesMap.set(elementId, [...filePaths]);

    // Store reverse mapping: file -> elements
    for (const filePath of filePaths) {
      const elements = this.fileToElementsMap.get(filePath) || [];
      if (!elements.includes(elementId)) {
        elements.push(elementId);
      }
      this.fileToElementsMap.set(filePath, elements);
    }
  }

  /**
   * Get file paths for a diagram element
   * 
   * @param elementId - The diagram element ID
   * @returns Array of file paths, or empty array if element not found
   */
  getFilesForElement(elementId: string): string[] {
    return this.elementToFilesMap.get(elementId) || [];
  }

  /**
   * Get diagram elements that contain a specific file
   * 
   * @param filePath - The file path to look up
   * @returns Array of element IDs, or empty array if file not found
   */
  getElementsForFile(filePath: string): string[] {
    return this.fileToElementsMap.get(filePath) || [];
  }

  /**
   * Check if an element has any file mappings
   * 
   * @param elementId - The diagram element ID
   * @returns True if element has file mappings
   */
  hasElement(elementId: string): boolean {
    return this.elementToFilesMap.has(elementId);
  }

  /**
   * Check if a file is mapped to any elements
   * 
   * @param filePath - The file path to check
   * @returns True if file is mapped to at least one element
   */
  hasFile(filePath: string): boolean {
    return this.fileToElementsMap.has(filePath);
  }

  /**
   * Remove a file from all mappings
   * Used when a file is deleted or renamed
   * 
   * @param filePath - The file path to remove
   */
  removeFile(filePath: string): void {
    // Get all elements that reference this file
    const elements = this.fileToElementsMap.get(filePath) || [];

    // Remove file from each element's file list
    for (const elementId of elements) {
      const files = this.elementToFilesMap.get(elementId) || [];
      const updatedFiles = files.filter(f => f !== filePath);
      
      if (updatedFiles.length > 0) {
        this.elementToFilesMap.set(elementId, updatedFiles);
      } else {
        // If element has no more files, remove it
        this.elementToFilesMap.delete(elementId);
      }
    }

    // Remove file from reverse mapping
    this.fileToElementsMap.delete(filePath);
  }

  /**
   * Rename a file in all mappings
   * Used when a file is renamed
   * 
   * @param oldPath - The old file path
   * @param newPath - The new file path
   */
  renameFile(oldPath: string, newPath: string): void {
    // Get all elements that reference this file
    const elements = this.fileToElementsMap.get(oldPath) || [];

    // Update file path in each element's file list
    for (const elementId of elements) {
      const files = this.elementToFilesMap.get(elementId) || [];
      const updatedFiles = files.map(f => f === oldPath ? newPath : f);
      this.elementToFilesMap.set(elementId, updatedFiles);
    }

    // Update reverse mapping
    this.fileToElementsMap.delete(oldPath);
    if (elements.length > 0) {
      this.fileToElementsMap.set(newPath, elements);
    }
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.elementToFilesMap.clear();
    this.fileToElementsMap.clear();
  }

  /**
   * Get all mapped element IDs
   * 
   * @returns Array of all element IDs in the mapping
   */
  getAllElementIds(): string[] {
    return Array.from(this.elementToFilesMap.keys());
  }

  /**
   * Get all mapped file paths
   * 
   * @returns Array of all file paths in the mapping
   */
  getAllFilePaths(): string[] {
    return Array.from(this.fileToElementsMap.keys());
  }

  /**
   * Get mapping statistics
   * 
   * @returns Object with mapping statistics
   */
  getStats(): { elementCount: number; fileCount: number; totalMappings: number } {
    let totalMappings = 0;
    for (const files of this.elementToFilesMap.values()) {
      totalMappings += files.length;
    }

    return {
      elementCount: this.elementToFilesMap.size,
      fileCount: this.fileToElementsMap.size,
      totalMappings
    };
  }
}
