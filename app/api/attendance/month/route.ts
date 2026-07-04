import { NextRequest, NextResponse } from "next/server";
import { getMonthlyAttendance } from "@/lib/firebase/attendance";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month required" },
        { status: 400 }
      );
    }

    const records = await getMonthlyAttendance(year, month);
    return NextResponse.json(
      auth.user?.role === "admin"
        ? records
        : records.filter((record) => record.employeeName === auth.user?.name)
    );
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 }
    );
  }
}
