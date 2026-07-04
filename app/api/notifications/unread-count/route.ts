import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/notifications/service";
import { requireAuth } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for a user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (auth.user?.role !== "admin" && auth.user?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - You can only access your own notifications" },
        { status: 403 }
      );
    }

    const count = await getUnreadCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
