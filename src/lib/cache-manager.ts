// Advanced Caching System
export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize = 100 * 1024 * 1024; // 100MB
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.loadCache();
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Generate cache key
  generateKey(prompt: string, options: any): string {
    const normalized = {
      prompt: prompt.toLowerCase().trim(),
      ...options
    };
    return btoa(JSON.stringify(normalized)).replace(/[+/=]/g, '');
  }

  // Set cache entry
  async set(key: string, data: any, ttl?: number): Promise<boolean> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      size: this.calculateSize(data),
      hits: 0,
      lastAccessed: Date.now()
    };

    // Check if we need to make space
    if (this.getCurrentSize() + entry.size > this.maxSize) {
      await this.evictLRU(entry.size);
    }

    this.cache.set(key, entry);
    this.saveCache();
    
    return true;
  }

  // Get cache entry
  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry.data;
  }

  // Delete cache entry
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.saveCache();
    }
    return deleted;
  }

  // Clear all cache
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    localStorage.removeItem('niro_cache');
    localStorage.removeItem('niro_cache_stats');
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.getCurrentSize(),
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? Math.round((this.stats.hits / totalRequests) * 100) : 0
    };
  }

  // Get cache entries for debugging
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  // Prefetch common requests
  async prefetch(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.get(key));
    await Promise.all(promises);
  }

  // Private methods
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimation
  }

  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(entry.key);
      freedSpace += entry.size;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      this.saveCache();
    }
  }

  private saveCache(): void {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('niro_cache', JSON.stringify(cacheData));
      localStorage.setItem('niro_cache_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save cache:', error);
    }
  }

  private loadCache(): void {
    try {
      const cacheData = localStorage.getItem('niro_cache');
      const statsData = localStorage.getItem('niro_cache_stats');
      
      if (cacheData) {
        const entries = JSON.parse(cacheData) as [string, CacheEntry][];
        this.cache = new Map(entries);
      }
      
      if (statsData) {
        this.stats = JSON.parse(statsData);
      }
    } catch (error) {
      console.warn('Failed to load cache:', error);
      this.cache = new Map();
      this.stats = { hits: 0, misses: 0 };
    }
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// CDN Cache Manager
export class CDNCacheManager {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Purge CDN cache
  async purge(urls: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/purge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ urls })
      });
      
      return response.ok;
    } catch (error) {
      console.error('CDN purge failed:', error);
      return false;
    }
  }

  // Get CDN cache stats
  async getStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Failed to get CDN stats:', error);
      return null;
    }
  }
}
