import { NextRequest, NextResponse } from "next/server";
import { setDoc, doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/security";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { name, position, role, status, totalWorkingDays, fixedInTime, fixedOutTime, fixedSalary, username, password } = body;

    const employeeId = params.id;

    // Check if document exists
    const docRef = doc(db, 'employees', employeeId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: "Employee not found. Cannot update non-existent employee." },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current employee)
    const nameQuery = query(
      collection(db, 'employees'),
      where('02_name', '==', name)
    );
    const nameSnapshot = await getDocs(nameQuery);
    
    // Check if any other employee has the same name
    const duplicateExists = nameSnapshot.docs.some(doc => doc.id !== employeeId);
    
    if (duplicateExists) {
      return NextResponse.json(
        { error: `Employee with name "${name}" already exists. Please use a different name.` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      '02_name': name,
      '03_position': position || '',
      '04_role': role || 'user',
      '05_status': status || 'active',
      '06_totalWorkingDays': parseInt(totalWorkingDays) || 26,
      '07_fixedInTime': fixedInTime || '09:00:00 AM',
      '08_fixedOutTime': fixedOutTime || '07:00:00 PM',
      '09_perMinuteRate': 0,
      '10_fixedSalary': parseFloat(fixedSalary) || 0,
      '11_username': username || '',
    };

    // Only update password if provided
    if (password && password.trim()) {
      updateData['12_password'] = await hashPassword(password);
    }

    // Update existing document only (merge: true)
    await setDoc(docRef, updateData, { merge: true });

    console.log(`✅ Employee ${employeeId} updated successfully`);

    return NextResponse.json({ success: true, message: "Employee updated successfully" });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}
