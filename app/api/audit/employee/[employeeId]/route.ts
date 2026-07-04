import { NextRequest, NextResponse } from "next/server";
import { getEmployeeAuditLogs } from "@/lib/audit/service";
import { requireAdmin } from "@/lib/api-auth";

/**
 * Get audit logs for a specific employee
 * GET /api/audit/employee/001?startDate=2025-01-01&endDate=2025-01-31
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { employeeId: string } }
) {
    try {
        const auth = requireAdmin(req);
        if (auth.response) return auth.response;

        const { employeeId } = params;
        const { searchParams } = new URL(req.url);

        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        const logs = await getEmployeeAuditLogs(undefined, employeeId, startDate, endDate);

        return NextResponse.json({
            logs,
            total: logs.length,
        });
    } catch (error) {
        console.error("Error fetching employee audit logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}
