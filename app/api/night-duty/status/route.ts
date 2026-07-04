import { NextRequest, NextResponse } from "next/server";
import { updateNightDutyStatus, getAllNightDutyRequests } from "@/lib/firebase/nightDuty";
import { getAllEmployees } from "@/lib/firebase/employees";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import { logNightDutyAction } from "@/lib/audit/service";
import { invalidateRelated } from "@/lib/cache/advanced-cache";
import { requireAdmin } from "@/lib/api-auth";

export async function PUT(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const { id, status, approvedBy, approvedById } = body;

    console.log(`📥 Received update request:`, { id, status, approvedBy, approvedById });

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get request details before updating
    console.log(`📋 Fetching all night duty requests...`);
    const requests = await getAllNightDutyRequests();
    console.log(`📊 Total requests found: ${requests.length}`);
    console.log(`🔍 Looking for request with ID: ${id}`);
    
    const nightDutyRequest = requests.find((r) => r.id === id);

    if (!nightDutyRequest) {
      console.error(`❌ Request not found in list. Available IDs:`, requests.map(r => r.id));
      return NextResponse.json(
        { error: `Night duty request not found: ${id}` },
        { status: 404 }
      );
    }

    console.log(`✅ Found request:`, nightDutyRequest);
    console.log(`🔄 Updating status to: ${status}`);
    
    await updateNightDutyStatus(id, status, approvedBy);

    // Send notification to employee
    try {
      const employees = await getAllEmployees();
      const employee = employees.find((emp) => emp.name === nightDutyRequest.employeeName);

      if (employee) {
        const isApproved = status.toLowerCase() === "approved";
        
        const notifType = isApproved
          ? NotificationType.NIGHT_DUTY_APPROVED 
          : NotificationType.NIGHT_DUTY_REJECTED;

        const notifTitle = isApproved
          ? "Night Duty Approved ✅" 
          : "Night Duty Rejected ❌";

        const notifMessage = isApproved
          ? `Your night duty request for ${nightDutyRequest.date} has been approved by ${approvedBy || "Admin"}. Please check-in at office location. Your attendance will be recorded as 9:00 PM - 7:00 AM.`
          : `Your night duty request for ${nightDutyRequest.date} has been rejected by ${approvedBy || "Admin"}`;

        await createNotification({
          userId: employee.id || '',
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          data: {
            requestId: id,
            date: nightDutyRequest.date,
            status,
            approvedBy,
          },
        });

        // Create audit log
        const auditAction = status.toLowerCase() === "approved" ? "APPROVE" : "REJECT";
        await logNightDutyAction({
          requestId: id,
          employeeId: employee.id || '',
          employeeName: employee.name,
          action: auditAction,
          performedBy: approvedBy || "Admin",
          performedById: approvedById || "ADMIN",
        });
      }
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
      // Don't fail the request if notification fails
    }

    // Invalidate night duty cache after status update
    invalidateRelated.nightDuty();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating night duty status:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update night duty status" },
      { status: 500 }
    );
  }
}
