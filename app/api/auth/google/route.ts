import { NextRequest, NextResponse } from "next/server";
import { getAllEmployees } from "@/lib/firebase/employees";
import { generateToken } from "@/lib/security";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "Missing Google credential" },
        { status: 400 }
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const googleUser = ticket.getPayload();
    const email = googleUser?.email;

    if (!email || !googleUser?.email_verified) {
      return NextResponse.json(
        { error: "Google email could not be verified" },
        { status: 401 }
      );
    }

    // Find employee by email
    const employees = await getAllEmployees();
    let employee = employees.find(emp => 
      emp.email?.toLowerCase() === email.toLowerCase()
    );

    if (!employee) {
      // Auto-register the new user with Google email
      const { addEmployee } = await import("@/lib/employees");
      const { invalidateRelated } = await import("@/lib/cache/advanced-cache");
      
      const rawName = googleUser?.name || email.split("@")[0];
      const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // Ensure unique username
      let username = baseUsername;
      let counter = 1;
      while (employees.some(emp => emp.username?.toLowerCase() === username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const newId = await addEmployee({
        name: rawName,
        position: "Employee",
        role: "user",
        status: "active",
        totalWorkingDays: 26,
        fixedInTime: "10:00:00 AM",
        fixedOutTime: "07:00:00 PM",
        perMinuteRate: 0,
        fixedSalary: 0,
        username: username,
        password: "", // No password for Google auth users
        email: email.toLowerCase(),
      });

      // Invalidate cache
      invalidateRelated.employee();

      employee = {
        id: newId,
        name: rawName,
        position: "Employee",
        role: "user",
        status: "active",
        totalWorkingDays: 26,
        fixedInTime: "10:00:00 AM",
        fixedOutTime: "07:00:00 PM",
        perMinuteRate: 0,
        fixedSalary: 0,
        username: username,
        password: "",
        email: email.toLowerCase(),
      };
    }

    // Check if employee is active
    if (employee.status === 'inactive') {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact admin." },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: employee.id || '',
      username: employee.username || employee.name,
      role: employee.role,
      name: employee.name,
    });

    return NextResponse.json({
      user: {
        id: employee.id || '',
        username: employee.username || employee.name,
        role: employee.role,
        name: employee.name,
      },
      token,
      expiresIn: "24h",
    });
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { error: "Google login failed. Please try again." },
      { status: 500 }
    );
  }
}
