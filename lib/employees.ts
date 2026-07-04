/**
 * Employee Management - Firebase Wrapper
 * This file provides backward compatibility with existing code
 */

import { Employee } from "./types";
import { hashPassword, verifyPassword } from "./security";
import { 
  getAllEmployees as getFirebaseEmployees, 
  addEmployee as addFirebaseEmployee, 
  deleteEmployee as deleteFirebaseEmployee, 
  getEmployeeByUsername as getFirebaseEmployeeByUsername 
} from "./firebase/employees";

/**
 * Get all employees from Firebase
 */
export async function getEmployees(): Promise<Employee[]> {
  return await getFirebaseEmployees();
}

/**
 * Add a new employee to Firebase
 */
export async function addEmployee(employee: Omit<Employee, "id">): Promise<string> {
  return await addFirebaseEmployee({
    ...employee,
    password: employee.password ? await hashPassword(employee.password) : "",
  });
}

/**
 * Delete an employee from Firebase
 */
export async function deleteEmployee(employeeId: string): Promise<void> {
  await deleteFirebaseEmployee(employeeId);
}

/**
 * Authenticate employee by username and password
 * Supports both old (with spreadsheetId) and new (without) signatures for backward compatibility
 */
export async function authenticateEmployee(
  username: string,
  password?: string
): Promise<Employee | null> {
  try {
    if (!password) {
      console.log(`❌ Password missing for: ${username}`);
      return null;
    }

    const employee = await getFirebaseEmployeeByUsername(username);
    
    if (!employee) {
      console.log(`❌ Employee not found: ${username}`);
      return null;
    }

    if (!await verifyPassword(password, employee.password || "")) {
      console.log(`❌ Invalid password for: ${username}`);
      return null;
    }

    console.log(`✅ Authentication successful for: ${username}`);
    return employee;
  } catch (error) {
    console.error("Error authenticating employee:", error);
    return null;
  }
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const employees = await getFirebaseEmployees();
  return employees.find(emp => emp.id === employeeId) || null;
}

/**
 * Update employee (for backward compatibility)
 */
export async function updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<void> {
  const { updateEmployee: updateFirebaseEmployee } = await import('./firebase/employees');
  const safeUpdates = { ...updates };
  if (safeUpdates.password) {
    safeUpdates.password = await hashPassword(safeUpdates.password);
  }
  await updateFirebaseEmployee(employeeId, safeUpdates);
}
