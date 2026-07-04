import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';
import { hashPassword } from '../security';

export interface Employee {
  id: string;
  name: string;
  position?: string;
  role: 'admin' | 'user';
  status?: 'active' | 'inactive';
  totalWorkingDays?: number;
  fixedInTime?: string;
  fixedOutTime?: string;
  perMinuteRate?: number;
  fixedSalary?: number;
  username?: string;
  password?: string;
  email?: string;
  createdAt?: Date;
}

const COLLECTION_NAME = 'employees';

// Get all employees (sorted by ID)
export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const employees: Employee[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      employees.push({
        id: data['01_id'] || docSnap.id,
        name: data['02_name'] || '',
        position: data['03_position'] || '',
        role: data['04_role'] || 'user',
        status: data['05_status'] || 'active',
        totalWorkingDays: data['06_totalWorkingDays'] || 26,
        fixedInTime: data['07_fixedInTime'] || '10:00:00 AM',
        fixedOutTime: data['08_fixedOutTime'] || '07:00:00 PM',
        perMinuteRate: data['09_perMinuteRate'] || 0,
        fixedSalary: data['10_fixedSalary'] || 0,
        username: data['11_username'] || '',
        password: data['12_password'] || '',
        email: data['13_email'] || '',
        createdAt: data['14_createdAt']?.toDate(),
      });
    });

    // Sort by ID (001, 002, 003, etc.)
    employees.sort((a, b) => {
      const idA = parseInt(a.id || '0');
      const idB = parseInt(b.id || '0');
      return idA - idB;
    });

    return employees;
  } catch (error) {
    console.error('Error getting employees:', error);
    throw error;
  }
}

// Add employee
export async function addEmployee(employee: Omit<Employee, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Get next 3-digit employee ID
    const employees = await getAllEmployees();
    let nextId = 1;

    if (employees.length > 0) {
      const existingIds = employees
        .map(emp => parseInt(emp.id || '0'))
        .filter(id => !isNaN(id));

      if (existingIds.length > 0) {
        nextId = Math.max(...existingIds) + 1;
      }
    }

    const id = String(nextId).padStart(3, '0');

    const trimmedName = employee.name.trim();
    // Create safe document ID from name
    const safeId = trimmedName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Auto-generate email if not provided
    const email = (employee.email || `${safeId}@company.com`).trim();

    const password = employee.password
      ? employee.password.startsWith('$2a$') || employee.password.startsWith('$2b$')
        ? employee.password
        : await hashPassword(employee.password)
      : '';

    await setDoc(doc(db, COLLECTION_NAME, safeId), {
      '01_id': id,
      '02_name': trimmedName,
      '03_position': (employee.position || '').trim(),
      '04_role': employee.role || 'user',
      '05_status': employee.status || 'active',
      '06_totalWorkingDays': employee.totalWorkingDays || 26,
      '07_fixedInTime': employee.fixedInTime || '10:00:00 AM',
      '08_fixedOutTime': employee.fixedOutTime || '07:00:00 PM',
      '09_perMinuteRate': employee.perMinuteRate || 0,
      '10_fixedSalary': employee.fixedSalary || 0,
      '11_username': (employee.username || '').trim(),
      '12_password': password,
      '13_email': email,
      '14_createdAt': Timestamp.now(),
    });

    return id;
  } catch (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
}

// Update employee
export async function updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, employeeId);

    // Convert updates to Firebase field format
    const firebaseUpdates: any = {};

    if (updates.name !== undefined) firebaseUpdates['02_name'] = updates.name.trim();
    if (updates.position !== undefined) firebaseUpdates['03_position'] = updates.position.trim();
    if (updates.role !== undefined) firebaseUpdates['04_role'] = updates.role;
    if (updates.status !== undefined) firebaseUpdates['05_status'] = updates.status;
    if (updates.totalWorkingDays !== undefined) firebaseUpdates['06_totalWorkingDays'] = updates.totalWorkingDays;
    if (updates.fixedInTime !== undefined) firebaseUpdates['07_fixedInTime'] = updates.fixedInTime;
    if (updates.fixedOutTime !== undefined) firebaseUpdates['08_fixedOutTime'] = updates.fixedOutTime;
    if (updates.perMinuteRate !== undefined) firebaseUpdates['09_perMinuteRate'] = updates.perMinuteRate;
    if (updates.fixedSalary !== undefined) firebaseUpdates['10_fixedSalary'] = updates.fixedSalary;
    if (updates.username !== undefined) firebaseUpdates['11_username'] = updates.username.trim();
    if (updates.password !== undefined) {
      firebaseUpdates['12_password'] =
        updates.password && !updates.password.startsWith('$2a$') && !updates.password.startsWith('$2b$')
          ? await hashPassword(updates.password)
          : updates.password;
    }
    if (updates.email !== undefined) firebaseUpdates['13_email'] = updates.email.trim();

    // Use setDoc with merge to avoid "document not found" error
    await setDoc(docRef, firebaseUpdates, { merge: true });

    console.log(`✅ Employee ${employeeId} updated successfully`);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

// Delete employee
export async function deleteEmployee(employeeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, employeeId));
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// Get employee by username
export async function getEmployeeByUsername(username: string): Promise<Employee | null> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('11_username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const employeeDoc = querySnapshot.docs[0];
    const data = employeeDoc.data();

    return {
      id: data['01_id'] || employeeDoc.id,
      name: data['02_name'] || '',
      position: data['03_position'] || '',
      role: data['04_role'] || 'user',
      status: data['05_status'] || 'active',
      totalWorkingDays: data['06_totalWorkingDays'] || 26,
      fixedInTime: data['07_fixedInTime'] || '10:00:00 AM',
      fixedOutTime: data['08_fixedOutTime'] || '07:00:00 PM',
      perMinuteRate: data['09_perMinuteRate'] || 0,
      fixedSalary: data['10_fixedSalary'] || 0,
      username: data['11_username'] || '',
      password: data['12_password'] || '',
      email: data['13_email'] || '',
      createdAt: data['14_createdAt']?.toDate(),
    };
  } catch (error) {
    console.error('Error getting employee by username:', error);
    return null;
  }
}
