/**
 * Simple in-memory cache for API responses
 * Reduces Firestore API calls
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL = 30000; // 30 seconds default

    /**
     * Set cache entry
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const now = Date.now();
        const expiresAt = now + (ttl || this.defaultTTL);

        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt,
        });
    }

    /**
     * Get cache entry
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Check if key exists and is valid
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete cache entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear expired entries
     */
    clearExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache stats
     */
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Export singleton instance
export const cache = new SimpleCache();

// Clear expired entries every minute
setInterval(() => {
    cache.clearExpired();
}, 60000);

/**
 * Cache key generators
 */
export const CacheKeys = {
    employees: () => "employees",
    leaves: () => "leaves",
    nightDuty: () => "night_duty",
    attendance: (month: string) => `attendance_${month}`,
    notifications: (userId: string) => `notifications_${userId}`,
    auditLogs: (filters: string) => `audit_logs_${filters}`,
};
