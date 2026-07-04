/**
 * Firebase Firestore - Night Duty Operations
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

export interface NightDutyRequest {
  id?: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate?: string;
  requestedTime?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  approvedTime?: string;
  createdAt?: Date;
}

/**
 * Add a new night duty request to Firebase (employee-wise structure)
 */
export async function addNightDutyRequest(dutyData: Omit<NightDutyRequest, 'id'>): Promise<string> {
  try {
    const { employeeName, date, ...requestData } = dutyData;
    
    // Create/update employee document
    await setDoc(doc(db, 'nightDuty', employeeName), {
      employeeName: employeeName,
      lastUpdated: Timestamp.now(),
    }, { merge: true });

    const now = new Date();
    const requestedTime = now.toLocaleTimeString('en-US', { hour12: true });
    
    // Add night duty request as subcollection with auto-generated ID
    const requestsRef = collection(db, 'nightDuty', employeeName, 'requests');
    const docRef = await addDoc(requestsRef, {
      '02_date': date,
      '03_startTime': requestData.startTime,
      '04_endTime': requestData.endTime,
      '05_reason': requestData.reason || '',
      '06_status': requestData.status,
      '07_appliedDate': requestData.appliedDate || now.toISOString().split('T')[0],
      '08_requestedTime': requestedTime,
      '09_requestedBy': requestData.requestedBy || employeeName,
      '10_approvedBy': requestData.approvedBy || '',
      '11_approvedDate': requestData.approvedDate || '',
      '12_approvedTime': requestData.approvedTime || '',
      '13_createdAt': Timestamp.now(),
    });

    console.log(`✅ Night duty request created with ID: ${docRef.id} for ${employeeName} on ${date}`);
    return docRef.id;
  } catch (error) {
    console.error('Error adding night duty request:', error);
    throw error;
  }
}

/**
 * Get all night duty requests from Firebase (employee-wise structure)
 */
export async function getAllNightDutyRequests(): Promise<NightDutyRequest[]> {
  try {
    const requests: NightDutyRequest[] = [];
    
    // Get all employees from nightDuty collection
    const employeesSnapshot = await getDocs(collection(db, 'nightDuty'));
    
    // For each employee, get their night duty requests
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeName = employeeDoc.id;
      const requestsRef = collection(db, 'nightDuty', employeeName, 'requests');
      const requestsSnapshot = await getDocs(requestsRef);
      
      requestsSnapshot.forEach((requestDoc) => {
        const data = requestDoc.data();
        requests.push({
          id: requestDoc.id,
          employeeName: employeeName,
          date: data['02_date'] || '',
          startTime: data['03_startTime'] || '',
          endTime: data['04_endTime'] || '',
          reason: data['05_reason'] || '',
          status: data['06_status'] || 'pending',
          appliedDate: data['07_appliedDate'] || '',
          requestedTime: data['08_requestedTime'] || '',
          requestedBy: data['09_requestedBy'] || '',
          approvedBy: data['10_approvedBy'] || '',
          approvedDate: data['11_approvedDate'] || '',
          approvedTime: data['12_approvedTime'] || '',
          createdAt: data['13_createdAt']?.toDate(),
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
    console.error('Error fetching night duty requests:', error);
    throw error;
  }
}

/**
 * Get night duty requests for a specific employee (employee-wise structure)
 */
export async function getNightDutyByEmployee(employeeName: string): Promise<NightDutyRequest[]> {
  try {
    const requests: NightDutyRequest[] = [];
    const requestsRef = collection(db, 'nightDuty', employeeName, 'requests');
    const requestsSnapshot = await getDocs(requestsRef);
    
    requestsSnapshot.forEach((requestDoc) => {
      const data = requestDoc.data();
      requests.push({
        id: requestDoc.id,
        employeeName: employeeName,
        date: data['02_date'] || '',
        startTime: data['03_startTime'] || '',
        endTime: data['04_endTime'] || '',
        reason: data['05_reason'] || '',
        status: data['06_status'] || 'pending',
        appliedDate: data['07_appliedDate'] || '',
        requestedTime: data['08_requestedTime'] || '',
        requestedBy: data['09_requestedBy'] || '',
        approvedBy: data['10_approvedBy'] || '',
        approvedDate: data['11_approvedDate'] || '',
        approvedTime: data['12_approvedTime'] || '',
        createdAt: data['13_createdAt']?.toDate(),
      });
    });
    
    // Sort by created date descending
    requests.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching employee night duty requests:', error);
    throw error;
  }
}

/**
 * Update night duty request status (employee-wise structure)
 */
export async function updateNightDutyStatus(
  dutyId: string,
  status: string,
  approvedBy?: string
): Promise<void> {
  try {
    console.log(`🔍 Searching for night duty request with ID: ${dutyId}`);
    
    // Normalize status to capitalize first letter
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    // Find the night duty request across all employees
    const employeesSnapshot = await getDocs(collection(db, 'nightDuty'));
    console.log(`📂 Found ${employeesSnapshot.docs.length} employees in nightDuty collection`);
    
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeName = employeeDoc.id;
      const requestRef = doc(db, 'nightDuty', employeeName, 'requests', dutyId);
      const requestSnap = await getDoc(requestRef);
      
      console.log(`🔎 Checking ${employeeName}/requests/${dutyId} - Exists: ${requestSnap.exists()}`);
      
      if (requestSnap.exists()) {
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        
        console.log(`✏️ Updating document with status: ${normalizedStatus}`);
        
        await updateDoc(requestRef, {
          '06_status': normalizedStatus,
          '10_approvedBy': approvedBy || '',
          '11_approvedDate': istTime.toISOString().split('T')[0],
          '12_approvedTime': istTime.toLocaleTimeString('en-US', { 
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
          }).toUpperCase(),
        });
        
        console.log(`✅ Night duty ${dutyId} updated to ${normalizedStatus} for ${employeeName}`);
        return;
      }
    }
    
    console.error(`❌ Night duty request ${dutyId} not found in any employee collection`);
    throw new Error(`Night duty request not found: ${dutyId}`);
  } catch (error) {
    console.error('Error updating night duty status:', error);
    throw error;
  }
}
