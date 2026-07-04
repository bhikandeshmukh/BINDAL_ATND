/**
 * Advanced in-memory cache with LRU eviction, memory limits, and tag-based invalidation
 * Optimized for Firestore response caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Approximate size in bytes
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
}

interface CacheConfig {
  defaultTTL?: number;
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory in bytes
  enableStats?: boolean;
}

class AdvancedCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private tagIndex: Map<string, Set<string>> = new Map(); // Tag -> Keys mapping

  private config: Required<CacheConfig> = {
    defaultTTL: 30000, // 30 seconds
    maxSize: 1000, // Max 1000 entries
    maxMemory: 50 * 1024 * 1024, // 50MB
    enableStats: true,
  };

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0,
    hitRate: 0,
  };

  constructor(config?: CacheConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Set cache entry with optional TTL and tags
   */
  set<T>(key: string, data: T, options?: { ttl?: number; tags?: string[] }): void {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTTL;
    const tags = options?.tags || [];
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    this.evictIfNeeded(size);

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
      this.removeFromTagIndex(key);
      this.stats.memoryUsage -= this.cache.get(key)!.size;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      tags,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.updateTagIndex(key, tags);

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage += size;
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.stats.hits++;
    this.updateHitRate();

    return entry.data as T;
  }

  /**
   * Get or set pattern (fetch if not in cache)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    this.removeFromTagIndex(key);

    this.stats.deletes++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage -= entry.size;

    return true;
  }

  /**
   * Invalidate all entries with specific tag
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of Array.from(keys)) {
      if (this.delete(key)) {
        count++;
      }
    }

    this.tagIndex.delete(tag);
    return count;
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        if (this.delete(key)) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.tagIndex.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Warm cache with data
   */
  async warm(entries: Array<{ key: string; fetcher: () => Promise<any>; options?: any }>): Promise<void> {
    const promises = entries.map(async ({ key, fetcher, options }) => {
      try {
        const data = await fetcher();
        this.set(key, data, options);
      } catch (error) {
        console.error(`Failed to warm cache for key: ${key}`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get detailed entry info
   */
  getEntryInfo(key: string): Omit<CacheEntry<any>, "data"> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    return {
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      size: entry.size,
      tags: entry.tags,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get keys by tag
   */
  getKeysByTag(tag: string): string[] {
    const keys = this.tagIndex.get(tag);
    return keys ? Array.from(keys) : [];
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
      hitRate: 0,
    };
  }

  // Private helper methods

  private evictIfNeeded(newEntrySize: number): void {
    // Check size limit
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Check memory limit
    while (this.stats.memoryUsage + newEntrySize > this.config.maxMemory) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder[0];
    this.delete(keyToEvict);
    this.stats.evictions++;
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    for (const tag of entry.tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  private estimateSize(data: any): number {
    try {
      const json = JSON.stringify(data);
      return json.length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default 1KB if can't estimate
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Export singleton instance with default config
export const cache = new AdvancedCache({
  defaultTTL: 30000, // 30 seconds
  maxSize: 1000,
  maxMemory: 50 * 1024 * 1024, // 50MB
  enableStats: true,
});

// Clear expired entries every minute
setInterval(() => {
  const cleared = cache.clearExpired();
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired cache entries`);
  }
}, 60000);

/**
 * Cache key generators with consistent naming
 */
export const CacheKeys = {
  employees: () => "employees:all",
  employee: (id: string) => `employee:${id}`,
  leaves: () => "leaves:all",
  leave: (id: string) => `leave:${id}`,
  leavesByUser: (userName: string) => `leaves:user:${userName}`,
  nightDuty: () => "night_duty:all",
  nightDutyByUser: (userName: string) => `night_duty:user:${userName}`,
  attendance: (month: string) => `attendance:${month}`,
  attendanceByUser: (userName: string, month: string) => `attendance:user:${userName}:${month}`,
  notifications: (userId: string) => `notifications:${userId}`,
  notificationCount: (userId: string) => `notifications:count:${userId}`,
  auditLogs: (filters: string) => `audit_logs:${filters}`,
  reports: (type: string, period: string) => `reports:${type}:${period}`,
};

/**
 * Cache tags for bulk invalidation
 */
export const CacheTags = {
  EMPLOYEES: "employees",
  LEAVES: "leaves",
  NIGHT_DUTY: "night_duty",
  ATTENDANCE: "attendance",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "audit_logs",
  REPORTS: "reports",
};

/**
 * Helper function to invalidate related caches
 */
export const invalidateRelated = {
  employee: () => {
    cache.invalidateByTag(CacheTags.EMPLOYEES);
    cache.invalidateByPattern(/^reports:/);
  },
  leave: () => {
    cache.invalidateByTag(CacheTags.LEAVES);
    cache.invalidateByPattern(/^reports:/);
  },
  attendance: () => {
    cache.invalidateByTag(CacheTags.ATTENDANCE);
    cache.invalidateByPattern(/^reports:/);
  },
  nightDuty: () => {
    cache.invalidateByTag(CacheTags.NIGHT_DUTY);
    cache.invalidateByPattern(/^reports:/);
  },
  notification: (userId: string) => {
    cache.delete(CacheKeys.notifications(userId));
    cache.delete(CacheKeys.notificationCount(userId));
  },
};

export { AdvancedCache };
