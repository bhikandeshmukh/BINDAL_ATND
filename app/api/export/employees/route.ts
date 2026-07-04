import { NextRequest, NextResponse } from "next/server";
import { getEmployees } from "@/lib/employees";
import { requireAdmin } from "@/lib/api-auth";

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * Export employees data as CSV
 * GET /api/export/employees
 */
export async function GET(req: NextRequest) {
    try {
        const auth = requireAdmin(req);
        if (auth.response) return auth.response;

        const employees = await getEmployees();

        if (employees.length === 0) {
            return NextResponse.json({ error: "No employees found" }, { status: 404 });
        }

        // Convert to CSV (exclude password)
        const headers = [
            "ID",
            "Name",
            "Position",
            "Role",
            "Status",
            "Total Working Days",
            "Fixed In Time",
            "Fixed Out Time",
            "Fixed Salary",
            "Username",
        ];

        const csvRows = [headers.join(",")];

        for (const emp of employees) {
            const row = [
                emp.id,
                emp.name,
                emp.position,
                emp.role,
                emp.status,
                emp.totalWorkingDays,
                emp.fixedInTime,
                emp.fixedOutTime,
                emp.fixedSalary,
                emp.username || "",
            ];
            csvRows.push(row.map((v) => `"${v}"`).join(","));
        }

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const filename = `employees_${new Date().toISOString().split("T")[0]}.csv`;

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv;charset=utf-8;",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting employees:", error);
        return NextResponse.json({ error: "Failed to export employees" }, { status: 500 });
    }
}
