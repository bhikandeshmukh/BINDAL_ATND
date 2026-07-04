import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache/advanced-cache";
import { requireAdmin } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/cache/clear
 * Clear cache (all, expired, or by tag/pattern)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { action, tag, pattern } = body;

    let result: any = {};

    switch (action) {
      case "all":
        cache.clear();
        result = { message: "All cache cleared" };
        break;

      case "expired":
        const expiredCount = cache.clearExpired();
        result = { message: `Cleared ${expiredCount} expired entries` };
        break;

      case "tag":
        if (!tag) {
          return NextResponse.json(
            { error: "Tag is required for tag-based clearing" },
            { status: 400 }
          );
        }
        const tagCount = cache.invalidateByTag(tag);
        result = { message: `Cleared ${tagCount} entries with tag: ${tag}` };
        break;

      case "pattern":
        if (!pattern) {
          return NextResponse.json(
            { error: "Pattern is required for pattern-based clearing" },
            { status: 400 }
          );
        }
        const regex = new RegExp(pattern);
        const patternCount = cache.invalidateByPattern(regex);
        result = { message: `Cleared ${patternCount} entries matching pattern: ${pattern}` };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: all, expired, tag, or pattern" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
      stats: cache.getStats(),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
