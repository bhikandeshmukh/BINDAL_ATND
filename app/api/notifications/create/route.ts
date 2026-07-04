import { NextRequest, NextResponse } from "next/server";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import { requireAdmin } from "@/lib/api-auth";
import { getAllEmployees } from "@/lib/firebase/employees";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/create
 * Create a manual notification (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { userId, type, title, message, data, sendToAll } = body;

    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    if (!sendToAll && !userId) {
      return NextResponse.json(
        { error: "User ID is required when not sending to all" },
        { status: 400 }
      );
    }

    // If sendToAll is true, we need to get all users
    if (sendToAll) {
      const employeeIds = (await getAllEmployees())
        .map((employee) => employee.id)
        .filter(Boolean);

      // Create notification for each user
      const notificationIds = await Promise.all(
        employeeIds.map((empId) =>
          createNotification({
            userId: empId,
            type: (type as NotificationType) || NotificationType.SYSTEM_ALERT,
            title,
            message,
            data,
          })
        )
      );

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${employeeIds.length} users`,
        count: employeeIds.length,
        notificationIds,
      });
    } else {
      // Create notification for single user
      const notificationId = await createNotification({
        userId,
        type: (type as NotificationType) || NotificationType.SYSTEM_ALERT,
        title,
        message,
        data,
      });

      return NextResponse.json({
        success: true,
        message: "Notification created successfully",
        notificationId,
      });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
