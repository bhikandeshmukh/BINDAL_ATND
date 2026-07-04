import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache/advanced-cache";
import { requireAdmin } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/cache/stats
 * Get cache statistics and monitoring data
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const stats = cache.getStats();
    const keys = cache.keys();

    // Get detailed info for top accessed entries
    const topEntries = keys
      .map((key) => ({
        key,
        info: cache.getEntryInfo(key),
      }))
      .filter((entry) => entry.info !== null)
      .sort((a, b) => (b.info?.accessCount || 0) - (a.info?.accessCount || 0))
      .slice(0, 10)
      .map((entry) => ({
        key: entry.key,
        accessCount: entry.info?.accessCount,
        size: entry.info?.size,
        age: Date.now() - (entry.info?.timestamp || 0),
        ttl: (entry.info?.expiresAt || 0) - Date.now(),
      }));

    return NextResponse.json({
      stats: {
        ...stats,
        hitRatePercentage: (stats.hitRate * 100).toFixed(2) + "%",
        memoryUsageMB: (stats.memoryUsage / (1024 * 1024)).toFixed(2) + " MB",
        avgEntrySize: stats.size > 0 ? (stats.memoryUsage / stats.size).toFixed(0) + " bytes" : "0 bytes",
      },
      topEntries,
      totalKeys: keys.length,
    });
  } catch (error) {
    console.error("Error fetching cache stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch cache stats" },
      { status: 500 }
    );
  }
}
