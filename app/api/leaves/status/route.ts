import { NextRequest, NextResponse } from "next/server";
import { updateLeaveStatus as updateFirebaseLeaveStatus, getAllLeaveRequests } from "@/lib/firebase/leaves";
import { getAllEmployees } from "@/lib/firebase/employees";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import { logLeaveAction } from "@/lib/audit/service";
import { invalidateRelated } from "@/lib/cache/advanced-cache";
import { requireAdmin } from "@/lib/api-auth";

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { id, status, paymentStatus, approvedBy, approvedById } = body;

    console.log("Received update request:", { id, status, paymentStatus, approvedBy });

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get leave details before updating
    const leaves = await getAllLeaveRequests();
    const leave = leaves.find((l) => l.id === id);

    if (!leave) {
      return NextResponse.json(
        { error: "Leave not found" },
        { status: 404 }
      );
    }

    // Update leave status in Firebase
    await updateFirebaseLeaveStatus(id, status, paymentStatus, approvedBy);

    // Send notification to employee
    try {
      const employees = await getAllEmployees();
      const employee = employees.find((emp) => emp.name === leave.employeeName);

      if (employee) {
        const isApproved = status.toLowerCase() === "approved";

        const notifType = isApproved
          ? NotificationType.LEAVE_APPROVED
          : NotificationType.LEAVE_REJECTED;

        const notifTitle = isApproved
          ? "Leave Request Approved ✅"
          : "Leave Request Rejected ❌";

        const notifMessage = isApproved
          ? `Your ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate} has been approved by ${approvedBy || "Admin"}`
          : `Your ${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate} has been rejected by ${approvedBy || "Admin"}`;

        await createNotification({
          userId: employee.id || '',
          type: notifType,
          title: notifTitle,
          message: notifMessage,
          data: {
            leaveId: id,
            leaveType: leave.leaveType,
            startDate: leave.startDate,
            endDate: leave.endDate,
            status,
            approvedBy,
          },
        });

        // Create audit log
        const auditAction = isApproved ? "APPROVE" : "REJECT";
        await logLeaveAction({
          leaveId: id,
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

    // Invalidate leaves cache after status update
    invalidateRelated.leave();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating leave status:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update leave status" },
      { status: 500 }
    );
  }
}
