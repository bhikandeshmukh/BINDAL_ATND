import { NextRequest, NextResponse } from "next/server";
import { getAttendanceStatus } from "@/lib/firebase/attendance";
import { canAccessEmployee, forbiddenResponse, requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { employeeName, date } = body;

    if (!employeeName || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!auth.user || !canAccessEmployee(auth.user, employeeName)) {
      return forbiddenResponse();
    }

    const status = await getAttendanceStatus(employeeName, date);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking attendance status:", error);
    return NextResponse.json(
      { error: "Failed to check attendance status" },
      { status: 500 }
    );
  }
}
