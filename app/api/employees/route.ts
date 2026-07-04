import { NextRequest, NextResponse } from "next/server";
import { addEmployee, getEmployees, deleteEmployee } from "@/lib/employees";
import { cache, CacheKeys, CacheTags, invalidateRelated } from "@/lib/cache/advanced-cache";
import { requireAdmin, requireAuth, sanitizeEmployee } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    // Use cache with 60 second TTL
    const employees = await cache.getOrSet(
      CacheKeys.employees(),
      () => getEmployees(),
      { ttl: 60000, tags: [CacheTags.EMPLOYEES] }
    );

    const safeEmployees = employees.map(sanitizeEmployee);
    return NextResponse.json(
      auth.user?.role === "admin"
        ? safeEmployees
        : safeEmployees.filter((employee) => employee.name === auth.user?.name)
    );
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { name, position, role, status, totalWorkingDays, fixedInTime, fixedOutTime, fixedSalary, username, password, email } = body;

    if (!name || !position || !totalWorkingDays || !fixedInTime || !fixedOutTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicate name before creating
    const employees = await getEmployees();
    const duplicateExists = employees.some(emp => emp.name.toLowerCase() === name.toLowerCase());
    
    if (duplicateExists) {
      return NextResponse.json(
        { error: `Employee with name "${name}" already exists. Please use a different name.` },
        { status: 400 }
      );
    }

    const employeeId = await addEmployee({
      name,
      position,
      role: role === "admin" ? "admin" : "user",
      status: status === "inactive" ? "inactive" : "active",
      totalWorkingDays: parseInt(totalWorkingDays),
      fixedInTime,
      fixedOutTime,
      perMinuteRate: 0,
      fixedSalary: parseFloat(fixedSalary) || 0,
      username: username || "",
      password: password || "",
      email: email || "",
    });

    // Invalidate employee cache
    invalidateRelated.employee();

    return NextResponse.json({ success: true, id: employeeId });
  } catch (error: any) {
    console.error("Error adding employee:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("id");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID required" },
        { status: 400 }
      );
    }

    await deleteEmployee(employeeId);

    // Invalidate employee cache
    invalidateRelated.employee();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
