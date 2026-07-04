import { NextRequest, NextResponse } from "next/server";
import { markAllAsRead } from "@/lib/notifications/service";
import { requireAuth } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read for a user
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (auth.user?.role !== "admin" && auth.user?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - You can only update your own notifications" },
        { status: 403 }
      );
    }

    const count = await markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      message: `Marked ${count} notifications as read`,
      count,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
