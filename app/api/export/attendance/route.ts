import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getMonthlyAttendance } from "@/lib/firebase/attendance";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * Export attendance data as CSV
 * GET /api/export/attendance?year=2025&month=01
 */
export async function GET(req: NextRequest) {
    try {
        const auth = requireAdmin(req);
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const year = searchParams.get("year") || new Date().getFullYear().toString();
        const month = searchParams.get("month") || String(new Date().getMonth() + 1).padStart(2, "0");

        const attendance = await getMonthlyAttendance(year, month);

        if (attendance.length === 0) {
            return NextResponse.json({ error: "No data found" }, { status: 404 });
        }

        // Convert to CSV
        const headers = [
            "Date",
            "Employee Name",
            "In Time",
            "Out Time",
            "In Location",
            "Out Location",
            "Total Minutes",
            "Total Hours",
        ];

        const csvRows = [headers.join(",")];

        for (const record of attendance) {
            const row = [
                record.date,
                record.employeeName,
                record.inTime,
                record.outTime,
                record.inLocation,
                record.outLocation,
                record.totalMinutes,
                record.totalHours,
            ];
            csvRows.push(row.map((v) => `"${v}"`).join(","));
        }

        const csvContent = "\uFEFF" + csvRows.join("\n"); // BOM for Excel
        const filename = `attendance_${year}_${month}.csv`;

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv;charset=utf-8;",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting attendance:", error);
        return NextResponse.json({ error: "Failed to export attendance" }, { status: 500 });
    }
}
