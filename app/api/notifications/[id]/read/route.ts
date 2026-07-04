import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/notifications/service";
import { requireAuth } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * PUT /api/notifications/[id]/read
 * Mark a notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const notificationId = params.id;
    const body = await request.json().catch(() => ({}));
    const userId = body.userId && body.userId !== "unknown" ? body.userId : auth.user?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    if (auth.user?.role !== "admin" && auth.user?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - You can only update your own notifications" },
        { status: 403 }
      );
    }

    await markNotificationAsRead(userId, notificationId);

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
