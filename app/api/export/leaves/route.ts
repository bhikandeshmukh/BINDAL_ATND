import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getAllLeaveRequests } from "@/lib/firebase/leaves";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * Export leaves data as CSV
 * GET /api/export/leaves
 */
export async function GET(req: NextRequest) {
    try {
        const auth = requireAdmin(req);
        if (auth.response) return auth.response;

        const leaves = await getAllLeaveRequests();

        if (leaves.length === 0) {
            return NextResponse.json({ error: "No leaves found" }, { status: 404 });
        }

        // Convert to CSV
        const headers = [
            "ID",
            "Employee Name",
            "Leave Type",
            "Start Date",
            "End Date",
            "Reason",
            "Status",
            "Payment Status",
            "Applied Date",
            "Approved By",
            "Approved Date",
        ];

        const csvRows = [headers.join(",")];

        for (const leave of leaves) {
            const row = [
                leave.id,
                leave.employeeName,
                leave.leaveType,
                leave.startDate,
                leave.endDate,
                leave.reason,
                leave.status,
                leave.paymentStatus || "",
                leave.appliedDate,
                leave.approvedBy || "",
                leave.approvedDate || "",
            ];
            csvRows.push(row.map((v) => `"${v}"`).join(","));
        }

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const filename = `leaves_${new Date().toISOString().split("T")[0]}.csv`;

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv;charset=utf-8;",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting leaves:", error);
        return NextResponse.json({ error: "Failed to export leaves" }, { status: 500 });
    }
}
