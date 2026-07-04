import { NextRequest, NextResponse } from "next/server";
import { getUserNotifications } from "@/lib/notifications/service";
import { requireAuth } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Get notifications for a user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

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

    const notifications = await getUserNotifications(
      userId,
      unreadOnly
    );

    // Transform to match client interface
    const transformedNotifications = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.isRead,
      createdAt: n.createdAt,
      metadata: n.data,
    }));

    return NextResponse.json({
      notifications: transformedNotifications,
      count: transformedNotifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
