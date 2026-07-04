import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { deleteNotification } from "@/lib/firebase/notifications";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const requestAuth = requireAuth(request);
        if (requestAuth.response) return requestAuth.response;

        const notificationId = params.id;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || requestAuth.user?.userId;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        if (requestAuth.user?.role !== "admin" && requestAuth.user?.userId !== userId) {
            return NextResponse.json(
                { error: "Forbidden - You can only delete your own notifications" },
                { status: 403 }
            );
        }

        await deleteNotification(userId, notificationId);

        return NextResponse.json({
            success: true,
            message: "Notification deleted",
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return NextResponse.json(
            { error: "Failed to delete notification" },
            { status: 500 }
        );
    }
}
