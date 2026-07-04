import { NextRequest, NextResponse } from "next/server";
import { getEmployees, addEmployee } from "@/lib/employees";
import { generateToken } from "@/lib/security";
import { validateData, registerSchema } from "@/lib/validation";
import { sanitizeInput } from "@/lib/security";
import { addSecurityHeaders } from "@/lib/middleware";
import { invalidateRelated } from "@/lib/cache/advanced-cache";

function to12HourFormat(time24?: string, defaultTime?: string): string {
  if (!time24) return defaultTime || "";
  try {
    const [hoursStr, minutesStr] = time24.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const period = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const formattedHours = String(hours).padStart(2, "0");
    const formattedMinutes = String(minutes).padStart(2, "0");
    return `${formattedHours}:${formattedMinutes}:00 ${period}`;
  } catch (error) {
    return defaultTime || "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateData(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name, email, username, password, position, fixedInTime, fixedOutTime, fixedSalary } = validation.data!;
    
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedName = sanitizeInput(name);
    const sanitizedPosition = sanitizeInput(position);

    // Check duplicate name, username, or email
    const employees = await getEmployees();
    
    const duplicateUsername = employees.some(
      (emp) => emp.username?.toLowerCase() === sanitizedUsername.toLowerCase()
    );
    if (duplicateUsername) {
      return NextResponse.json(
        { error: "Username already exists. Please choose another one." },
        { status: 400 }
      );
    }

    const duplicateEmail = employees.some(
      (emp) => emp.email?.toLowerCase() === sanitizedEmail.toLowerCase()
    );
    if (duplicateEmail) {
      return NextResponse.json(
        { error: "Email is already registered. Please login or use another email." },
        { status: 400 }
      );
    }

    const duplicateName = employees.some(
      (emp) => emp.name.toLowerCase() === sanitizedName.toLowerCase()
    );
    if (duplicateName) {
      return NextResponse.json(
        { error: `An employee with name "${sanitizedName}" already exists. Please add a suffix or middle name.` },
        { status: 400 }
      );
    }

    // Register employee with user defaults
    const employeeId = await addEmployee({
      name: sanitizedName,
      position: sanitizedPosition,
      role: "user",
      status: "active",
      totalWorkingDays: 26,
      fixedInTime: to12HourFormat(fixedInTime, "10:00:00 AM"),
      fixedOutTime: to12HourFormat(fixedOutTime, "07:00:00 PM"),
      perMinuteRate: 0,
      fixedSalary: fixedSalary || 0,
      username: sanitizedUsername,
      password: password,
      email: sanitizedEmail,
    });

    // Invalidate employee cache
    invalidateRelated.employee();

    // Generate JWT token
    const token = generateToken({
      userId: employeeId,
      username: sanitizedUsername,
      role: "user",
      name: sanitizedName,
    });

    const response = NextResponse.json({
      user: {
        id: employeeId,
        username: sanitizedUsername,
        role: "user",
        name: sanitizedName,
        email: sanitizedEmail,
        fixedSalary: fixedSalary || 0,
      },
      token,
      expiresIn: "24h",
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
