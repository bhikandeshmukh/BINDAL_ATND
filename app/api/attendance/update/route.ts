import { NextRequest, NextResponse } from "next/server";
import { updateCheckOut } from "@/lib/firebase/attendance";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllNightDutyRequests } from "@/lib/firebase/nightDuty";
import { createNotification, NotificationType } from "@/lib/notifications/service";
import {
  canAccessEmployee,
  forbiddenResponse,
  isWithinOfficeRadius,
  parseLocation,
  requireAuth,
} from "@/lib/api-auth";

/**
 * Check if employee left early and send notifications
 */
async function checkEarlyLeave(employeeName: string, outTime: string) {
  try {
    const employees = await getAllEmployees();
    const employee = employees.find(emp => emp.name === employeeName);
    
    if (!employee || !employee.fixedOutTime) return;

    // Parse times
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const actualOutMinutes = parseTime(outTime);
    const expectedOutMinutes = parseTime(employee.fixedOutTime);
    const earlyMinutes = expectedOutMinutes - actualOutMinutes;

    // If left early by more than 5 minutes
    if (earlyMinutes > 5) {
      // Send notification to employee
      if (employee.id) {
        await createNotification({
          userId: employee.id,
          type: NotificationType.SYSTEM_ALERT,
          title: '🚪 Early Leave Alert',
          message: `You left ${earlyMinutes} minutes early today. Expected: ${employee.fixedOutTime}, Actual: ${outTime}`,
          data: {
            expectedTime: employee.fixedOutTime,
            actualTime: outTime,
            earlyMinutes,
          },
        });
      }

      // Send notification to all admins
      const admins = employees.filter(emp => emp.role === 'admin');
      for (const admin of admins) {
        if (admin.id) {
          await createNotification({
            userId: admin.id,
            type: NotificationType.SYSTEM_ALERT,
            title: '🚪 Employee Early Leave',
            message: `${employeeName} left ${earlyMinutes} minutes early. Expected: ${employee.fixedOutTime}, Actual: ${outTime}`,
            data: {
              employeeName,
              expectedTime: employee.fixedOutTime,
              actualTime: outTime,
              earlyMinutes,
            },
          });
        }
      }

      console.log(`🚪 Early leave alert sent for ${employeeName} (${earlyMinutes} min early)`);
    }
  } catch (error) {
    console.error('Error checking early leave:', error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { employeeName, date, outTime, outLocation, modifiedBy } = body;

    if (!employeeName || !date || !outTime || !outLocation) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!auth.user || !canAccessEmployee(auth.user, employeeName)) {
      return forbiddenResponse();
    }

    if (auth.user.role !== "admin") {
      const location = parseLocation(outLocation);
      if (!location || !isWithinOfficeRadius(location.latitude, location.longitude)) {
        return NextResponse.json(
          { error: "Attendance can only be marked from the office location" },
          { status: 403 }
        );
      }
    }

    const nightDutyRequests = await getAllNightDutyRequests();
    const isApprovedNightDuty = nightDutyRequests.some(
      (request) =>
        request.employeeName === employeeName &&
        request.date === date &&
        request.status.toLowerCase() === "approved"
    );

    // For approved night duty, use fixed time (7:00 AM) for attendance sheet
    // But store real time in backend for tracking
    const displayTime = isApprovedNightDuty ? "07:00:00 AM" : outTime;
    const realTimeLocation = isApprovedNightDuty ? `${outLocation} (Real: ${outTime})` : outLocation;

    await updateCheckOut(
      employeeName,
      date,
      displayTime,
      realTimeLocation,
      modifiedBy || undefined
    );

    // Check for early leave
    await checkEarlyLeave(employeeName, outTime);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 }
    );
  }
}
