/**
 * ArchitecturalModelCache: LRU cache for ArchitecturalModel responses
 * 
 * Caches LLM-generated architectural models keyed by hash of GroundingData.
 * Implements LRU eviction with max 100 entries and file modification time tracking.
 * 
 * Requirements: 9.5
 * Task: 6.3
 */

import * as crypto from 'crypto';
import { GroundingData, ArchitecturalModel } from '../types/analysis';

/**
 * Cache entry with metadata for invalidation
 */
interface CacheEntry {
  model: ArchitecturalModel;
  tier: 1 | 2 | 3;
  fileModTimes: Map<string, number>; // file path -> modification time
  timestamp: number;
}

/**
 * LRU cache for ArchitecturalModel responses
 */
export class ArchitecturalModelCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[]; // LRU tracking
  private readonly maxEntries: number = 100;

  constructor() {
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get cached model if available and valid
   * 
   * @param grounding - The grounding data to look up
   * @param tier - The tier level
   * @returns Cached model or null if not found/invalid
   */
  async get(
    grounding: GroundingData,
    tier: 1 | 2 | 3
  ): Promise<ArchitecturalModel | null> {
    const key = this.buildCacheKey(grounding, tier);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if any files have been modified since cache entry was created
    const isValid = await this.validateEntry(entry, grounding);
    if (!isValid) {
      // Invalidate the entry
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }

    // Update LRU order
    this.updateAccessOrder(key);

    return entry.model;
  }

  /**
   * Store model in cache
   * 
   * @param grounding - The grounding data used to generate the model
   * @param tier - The tier level used
   * @param model - The architectural model to cache
   */
  async set(
    grounding: GroundingData,
    tier: 1 | 2 | 3,
    model: ArchitecturalModel
  ): Promise<void> {
    const key = this.buildCacheKey(grounding, tier);

    // Get current file modification times
    const fileModTimes = await this.getFileModificationTimes(grounding);

    const entry: CacheEntry = {
      model,
      tier,
      fileModTimes,
      timestamp: Date.now(),
    };

    // Add to cache
    this.cache.set(key, entry);
    this.updateAccessOrder(key);

    // Evict if over limit
    this.evictIfNeeded();
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxEntries,
    };
  }

  /**
   * Build cache key from grounding data and tier
   * Key format: <groundingHash>:<tier>
   */
  private buildCacheKey(grounding: GroundingData, tier: 1 | 2 | 3): string {
    const hash = this.hashGroundingData(grounding);
    return `${hash}:${tier}`;
  }

  /**
   * Hash grounding data structure for cache key
   * Uses SHA-256 hash of JSON representation
   */
  private hashGroundingData(grounding: GroundingData): string {
    // Create a stable representation of the grounding data
    // Exclude timestamp as it changes on every analysis
    const stable = {
      rootPath: grounding.rootPath,
      directoryTree: grounding.directoryTree,
      files: grounding.files,
      importGraph: grounding.importGraph,
      inheritanceGraph: grounding.inheritanceGraph,
    };

    const json = JSON.stringify(stable);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Get modification times for all files in grounding data
   */
  private async getFileModificationTimes(
    grounding: GroundingData
  ): Promise<Map<string, number>> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const modTimes = new Map<string, number>();

    for (const file of grounding.files) {
      try {
        // Resolve absolute path
        const absolutePath = path.isAbsolute(file.path)
          ? file.path
          : path.join(grounding.rootPath, file.path);

        const stats = await fs.stat(absolutePath);
        modTimes.set(file.path, stats.mtimeMs);
      } catch (error) {
        // If file doesn't exist or can't be accessed, use 0
        modTimes.set(file.path, 0);
      }
    }

    return modTimes;
  }

  /**
   * Validate cache entry by checking file modification times
   */
  private async validateEntry(
    entry: CacheEntry,
    grounding: GroundingData
  ): Promise<boolean> {
    const currentModTimes = await this.getFileModificationTimes(grounding);

    // Check if any file has been modified
    for (const [filePath, cachedModTime] of entry.fileModTimes) {
      const currentModTime = currentModTimes.get(filePath);
      
      if (currentModTime === undefined) {
        // File no longer exists in grounding data
        return false;
      }

      if (currentModTime !== cachedModTime) {
        // File has been modified
        return false;
      }
    }

    // Check if any new files were added
    if (currentModTimes.size !== entry.fileModTimes.size) {
      return false;
    }

    return true;
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entries if over limit
   */
  private evictIfNeeded(): void {
    while (this.cache.size > this.maxEntries) {
      // Remove least recently used (first in array)
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }
}
