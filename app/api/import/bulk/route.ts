import { NextRequest, NextResponse } from "next/server";
import { addEmployee as addFirebaseEmployee } from "@/lib/firebase/employees";
import { addCheckIn } from "@/lib/firebase/attendance";
import { addLeaveRequest } from "@/lib/firebase/leaves";
import { addNightDutyRequest } from "@/lib/firebase/nightDuty";
import { createNotification } from "@/lib/firebase/notifications";
import { parseCSVLine, processCsvRow } from "@/lib/utils/csv-processor";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: "Missing file or type" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file is empty or invalid" },
        { status: 400 }
      );
    }

    // Use enhanced CSV parsing to handle quotes and special characters
    const headers = parseCSVLine(lines[0]);
    const dataLines = lines.slice(1);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      // Use enhanced CSV parsing to handle quotes and special characters
      const values = parseCSVLine(line);
      const rawRow: any = {};
      
      headers.forEach((header, index) => {
        rawRow[header] = values[index] || "";
      });

      try {
        // Process the row with sanitization and format conversion
        const row = processCsvRow(rawRow, type);
        if (type === "employees") {
          await addFirebaseEmployee({
            name: row["Name"],
            position: row["Position"],
            role: row["Role"]?.toLowerCase() === "admin" ? "admin" : "user",
            status: row["Status"]?.toLowerCase() === "inactive" ? "inactive" : "active",
            totalWorkingDays: row["Total Working Days"], // Already converted to number
            fixedInTime: row["Fixed In Time"] || "09:00:00 AM", // Already converted to proper time format
            fixedOutTime: row["Fixed Out Time"] || "07:00:00 PM", // Already converted to proper time format
            perMinuteRate: 0,
            fixedSalary: row["Fixed Salary"], // Already converted to number
            username: row["Username"],
            password: row["Password"],
          });
          success++;
        } else if (type === "attendance") {
          await addCheckIn({
            employeeName: row["Employee Name"],
            date: row["Date"], // Already converted to YYYY-MM-DD format
            inTime: row["In Time"], // Already converted to proper time format
            outTime: row["Out Time"], // Already converted to proper time format
            inLocation: row["In Location"],
            outLocation: row["Out Location"],
            totalMinutes: row["Total Minutes"], // Already converted to number
            totalHours: row["Total Hours"],
            modifiedBy: row["Modified By"],
            overtimeMinutes: row["Overtime Minutes"], // Already converted to number
            overtimePay: row["Overtime Pay"], // Already converted to number
            isHoliday: row["Is Holiday"],
          });
          success++;
        } else if (type === "leaves") {
          await addLeaveRequest({
            employeeName: row["Employee Name"],
            leaveType: row["Leave Type"],
            startDate: row["Start Date"], // Already converted to YYYY-MM-DD format
            endDate: row["End Date"], // Already converted to YYYY-MM-DD format
            reason: row["Reason"],
            status: row["Status"] || "pending",
            paymentStatus: row["Payment Status"],
            appliedDate: row["Applied Date"] || new Date().toISOString().split("T")[0], // Already converted to YYYY-MM-DD format
          });
          success++;
        } else if (type === "nightDuty") {
          await addNightDutyRequest({
            employeeName: row["Employee Name"],
            date: row["Date"], // Already converted to YYYY-MM-DD format
            startTime: row["Start Time"] || "09:00:00 PM", // Already converted to proper time format
            endTime: row["End Time"] || "07:00:00 AM", // Already converted to proper time format
            reason: row["Reason"],
            status: row["Status"] || "pending",
            appliedDate: row["Applied Date"] || new Date().toISOString().split("T")[0], // Already converted to YYYY-MM-DD format
            requestedBy: row["Requested By"] || row["Employee Name"],
          });
          success++;
        } else if (type === "notifications") {
          const sendToAll = row["Send To All"]?.toLowerCase() === "yes";
          
          if (sendToAll) {
            // Send to all users - would need to fetch all employees
            // For now, skip or implement separately
            errors.push(`Row ${i + 2}: Send to all not implemented in bulk import`);
            failed++;
          } else {
            await createNotification({
              userId: row["User ID"],
              type: row["Type"],
              title: row["Title"],
              message: row["Message"],
            });
            success++;
          }
        }
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${error.message || "Import failed"}`);
      }
    }

    return NextResponse.json({
      success,
      failed,
      errors,
      message: `Imported ${success} records successfully${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}
