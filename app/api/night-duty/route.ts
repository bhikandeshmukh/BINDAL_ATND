import { NextRequest, NextResponse } from "next/server";
import { addNightDutyRequest, getAllNightDutyRequests } from "@/lib/firebase/nightDuty";
import { getAllEmployees } from "@/lib/firebase/employees";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import { cache, CacheKeys, CacheTags, invalidateRelated } from "@/lib/cache/advanced-cache";
import { canAccessEmployee, forbiddenResponse, requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { employeeName, date, reason, requestedBy } = body;

    if (!employeeName || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!auth.user || !canAccessEmployee(auth.user, employeeName)) {
      return forbiddenResponse();
    }

    await addNightDutyRequest({
      employeeName,
      date,
      startTime: "09:00:00 PM",
      endTime: "07:00:00 AM",
      reason: reason || '',
      status: "Pending",
      appliedDate: new Date().toISOString().split("T")[0],
      requestedBy: auth.user.role === "admin" ? requestedBy || employeeName : auth.user.name,
    });

    // Send notifications to all admins
    try {
      const employees = await getAllEmployees();
      const admins = employees.filter((emp) => emp.role === "admin");

      for (const admin of admins) {
        await createNotification({
          userId: admin.id || '',
          type: NotificationType.NIGHT_DUTY_REQUEST,
          title: "New Night Duty Request",
          message: `${employeeName} has requested night duty for ${date}`,
          data: {
            employeeName,
            date,
            reason,
          },
        });
      }
    } catch (notifError) {
      console.error("Error sending notifications:", notifError);
      // Don't fail the request if notification fails
    }

    // Invalidate night duty cache
    invalidateRelated.nightDuty();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding night duty request:", error);
    
    // Check if it's a duplicate error
    if (error?.message?.includes("already exists")) {
      return NextResponse.json(
        { error: "Night duty request already exists for this date" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to add night duty request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    // Use cache with 30 second TTL
    const requests = await cache.getOrSet(
      CacheKeys.nightDuty(),
      () => getAllNightDutyRequests(),
      { ttl: 30000, tags: [CacheTags.NIGHT_DUTY] }
    );
    
    console.log(`Fetched ${requests.length} night duty requests (cached)`);
    
    return NextResponse.json(
      auth.user?.role === "admin"
        ? requests
        : requests.filter((nightDuty) => nightDuty.employeeName === auth.user?.name)
    );
  } catch (error) {
    console.error("Error fetching night duty requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch night duty requests" },
      { status: 500 }
    );
  }
}
