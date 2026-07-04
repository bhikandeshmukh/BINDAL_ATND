import { NextRequest, NextResponse } from "next/server";
import { addLeaveRequest, getAllLeaveRequests } from "@/lib/firebase/leaves";
import { getAllEmployees } from "@/lib/firebase/employees";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import { cache, CacheKeys, CacheTags, invalidateRelated } from "@/lib/cache/advanced-cache";
import { canAccessEmployee, forbiddenResponse, requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { employeeName, leaveType, startDate, endDate, reason } = body;

    if (!employeeName || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!auth.user || !canAccessEmployee(auth.user, employeeName)) {
      return forbiddenResponse();
    }

    // Add leave request to Firebase
    const leaveId = await addLeaveRequest({
      employeeName,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "pending",
      appliedDate: new Date().toISOString().split("T")[0],
    });

    // Send notifications to all admins
    try {
      const employees = await getAllEmployees();
      const admins = employees.filter((emp) => emp.role === "admin");

      for (const admin of admins) {
        if (admin.id) {
          await createNotification({
            userId: admin.id,
            type: NotificationType.LEAVE_REQUEST,
            title: "New Leave Request",
            message: `${employeeName} has requested ${leaveType} leave from ${startDate} to ${endDate}`,
            data: {
              employeeName,
              leaveType,
              startDate,
              endDate,
              reason,
            },
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
      // Don't fail the request if notification fails
    }

    // Invalidate leaves cache
    invalidateRelated.leave();

    return NextResponse.json({ success: true, id: leaveId });
  } catch (error) {
    console.error("Error adding leave record:", error);
    return NextResponse.json(
      { error: "Failed to add leave record" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    // Use cache with 30 second TTL
    const leaves = await cache.getOrSet(
      CacheKeys.leaves(),
      () => getAllLeaveRequests(),
      { ttl: 30000, tags: [CacheTags.LEAVES] }
    );
    
    return NextResponse.json(
      auth.user?.role === "admin"
        ? leaves
        : leaves.filter((leave) => leave.employeeName === auth.user?.name)
    );
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}
