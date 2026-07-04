/**
 * Firebase Firestore - Leave Requests Operations
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  setDoc,
  getDoc,
  addDoc,
} from 'firebase/firestore';
import { db } from './config';

export interface LeaveRequest {
  id?: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  paymentStatus?: string;
  approvedBy?: string;
  approvedDate?: string;
  approvedTime?: string;
  createdAt?: Date;
}

/**
 * Add a new leave request to Firebase (employee-wise structure)
 */
export async function addLeaveRequest(leaveData: Omit<LeaveRequest, 'id'>): Promise<string> {
  try {
    const { employeeName, ...requestData } = leaveData;
    
    // Create/update employee document
    await setDoc(doc(db, 'leaveRequests', employeeName), {
      employeeName: employeeName,
      lastUpdated: Timestamp.now(),
    }, { merge: true });

    // Add leave request as subcollection with auto-generated ID
    const requestsRef = collection(db, 'leaveRequests', employeeName, 'requests');
    const docRef = await addDoc(requestsRef, {
      '02_leaveType': requestData.leaveType,
      '03_startDate': requestData.startDate,
      '04_endDate': requestData.endDate,
      '05_reason': requestData.reason,
      '06_status': requestData.status,
      '07_paymentStatus': requestData.paymentStatus || '',
      '08_appliedDate': requestData.appliedDate,
      '09_approvedBy': requestData.approvedBy || '',
      '10_approvedDate': requestData.approvedDate || '',
      '11_approvedTime': requestData.approvedTime || '',
      '12_createdAt': Timestamp.now(),
    });

    console.log(`✅ Leave request created with ID: ${docRef.id} for ${employeeName}`);
    return docRef.id;
  } catch (error) {
    console.error('Error adding leave request:', error);
    throw error;
  }
}

/**
 * Get all leave requests from Firebase (employee-wise structure)
 */
export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const requests: LeaveRequest[] = [];
    
    // Get all employees from leaveRequests collection
    const employeesSnapshot = await getDocs(collection(db, 'leaveRequests'));
    
    // For each employee, get their leave requests
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeName = employeeDoc.id;
      const requestsRef = collection(db, 'leaveRequests', employeeName, 'requests');
      const requestsSnapshot = await getDocs(requestsRef);
      
      requestsSnapshot.forEach((requestDoc) => {
        const data = requestDoc.data();
        requests.push({
          id: requestDoc.id,
          employeeName: employeeName,
          leaveType: data['02_leaveType'] || '',
          startDate: data['03_startDate'] || '',
          endDate: data['04_endDate'] || '',
          reason: data['05_reason'] || '',
          status: data['06_status'] || 'pending',
          appliedDate: data['08_appliedDate'] || '',
          paymentStatus: data['07_paymentStatus'] || '',
          approvedBy: data['09_approvedBy'] || '',
          approvedDate: data['10_approvedDate'] || '',
          approvedTime: data['11_approvedTime'] || '',
          createdAt: data['12_createdAt']?.toDate(),
        });
      });
    }
    
    // Sort by created date descending
    requests.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    throw error;
  }
}

/**
 * Get leave requests for a specific employee (employee-wise structure)
 */
export async function getLeaveRequestsByEmployee(employeeName: string): Promise<LeaveRequest[]> {
  try {
    const requests: LeaveRequest[] = [];
    const requestsRef = collection(db, 'leaveRequests', employeeName, 'requests');
    const requestsSnapshot = await getDocs(requestsRef);
    
    requestsSnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      requests.push({
        id: requestDoc.id,
        employeeName: employeeName,
        leaveType: data['02_leaveType'] || '',
        startDate: data['03_startDate'] || '',
        endDate: data['04_endDate'] || '',
        reason: data['05_reason'] || '',
        status: data['06_status'] || 'pending',
        appliedDate: data['08_appliedDate'] || '',
        paymentStatus: data['07_paymentStatus'] || '',
        approvedBy: data['09_approvedBy'] || '',
        approvedDate: data['10_approvedDate'] || '',
        approvedTime: data['11_approvedTime'] || '',
        createdAt: data['12_createdAt']?.toDate(),
      });
    });
    
    // Sort by created date descending
    requests.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching employee leave requests:', error);
    throw error;
  }
}

/**
 * Update leave request status (employee-wise structure)
 * leaveId format: "employeeName/requestId"
 */
export async function updateLeaveStatus(
  leaveId: string,
  status: 'approved' | 'rejected',
  paymentStatus?: string,
  approvedBy?: string
): Promise<void> {
  try {
    // Find the leave request across all employees
    const employeesSnapshot = await getDocs(collection(db, 'leaveRequests'));
    
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeName = employeeDoc.id;
      const requestRef = doc(db, 'leaveRequests', employeeName, 'requests', leaveId);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const now = new Date();
        const updateData: any = {
          '06_status': status,
          '09_approvedBy': approvedBy || '',
          '10_approvedDate': now.toISOString().split('T')[0],
          '11_approvedTime': now.toLocaleTimeString('en-US', { hour12: true }),
        };

        if (paymentStatus) {
          updateData['07_paymentStatus'] = paymentStatus;
        }

        await updateDoc(requestRef, updateData);
        return;
      }
    }
    
    throw new Error('Leave request not found');
  } catch (error) {
    console.error('Error updating leave status:', error);
    throw error;
  }
}
