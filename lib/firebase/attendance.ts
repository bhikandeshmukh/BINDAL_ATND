import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';

export interface AttendanceRecord {
  id?: string;
  employeeName: string;
  date: string;
  inTime: string;
  outTime?: string;
  inLocation: string;
  outLocation?: string;
  totalMinutes?: number;
  totalHours?: string;
  overtimeMinutes?: number;
  overtimePay?: number;
  isHoliday?: string;
  createdAt?: Date;
  modifiedBy?: string;
}

const COLLECTION_NAME = 'attendance';

// Add check-in (employee-wise subcollection structure)
export async function addCheckIn(data: Omit<AttendanceRecord, 'id' | 'createdAt'>) {
  try {
    const { employeeName, date, ...recordData } = data;
    
    // Create/update employee document
    await setDoc(doc(db, COLLECTION_NAME, employeeName), {
      employeeName: employeeName,
      lastUpdated: Timestamp.now(),
    }, { merge: true });

    // Add attendance record as subcollection
    await setDoc(doc(db, COLLECTION_NAME, employeeName, 'records', date), {
      '01_date': date,
      '02_inTime': recordData.inTime,
      '03_outTime': recordData.outTime || '',
      '04_inLocation': recordData.inLocation,
      '05_outLocation': recordData.outLocation || '',
      '06_totalMinutes': recordData.totalMinutes || 0,
      '07_totalHours': recordData.totalHours || '',
      '08_modifiedBy': recordData.modifiedBy || '',
      '09_overtimeMinutes': recordData.overtimeMinutes || 0,
      '10_overtimePay': recordData.overtimePay || 0,
      '11_isHoliday': recordData.isHoliday || '',
      '12_createdAt': Timestamp.now(),
    });

    return { success: true, id: date };
  } catch (error) {
    console.error('Error adding check-in:', error);
    throw error;
  }
}

// Update check-out (employee-wise subcollection structure)
export async function updateCheckOut(
  employeeName: string,
  date: string,
  outTime: string,
  outLocation: string,
  modifiedBy?: string
) {
  try {
    // Get the attendance record
    const recordRef = doc(db, COLLECTION_NAME, employeeName, 'records', date);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      throw new Error('Attendance record not found');
    }

    const attendanceData = recordSnap.data();
    const inTime = attendanceData['02_inTime'];

    // Calculate total minutes
    const totalMinutes = calculateMinutes(inTime, outTime);
    const totalHours = formatHours(totalMinutes);

    await updateDoc(recordRef, {
      '03_outTime': outTime,
      '05_outLocation': outLocation,
      '06_totalMinutes': totalMinutes,
      '07_totalHours': totalHours,
      '08_modifiedBy': modifiedBy || '',
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating check-out:', error);
    throw error;
  }
}

// Get attendance status for today (employee-wise subcollection structure)
export async function getAttendanceStatus(employeeName: string, date: string) {
  try {
    const recordRef = doc(db, COLLECTION_NAME, employeeName, 'records', date);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      return {
        hasCheckedIn: false,
        hasCheckedOut: false,
      };
    }

    const data = recordSnap.data();
    return {
      hasCheckedIn: true,
      hasCheckedOut: !!data['03_outTime'],
      inTime: data['02_inTime'],
      outTime: data['03_outTime'],
      inLocation: data['04_inLocation'],
      outLocation: data['05_outLocation'],
    };
  } catch (error) {
    console.error('Error getting attendance status:', error);
    throw error;
  }
}

// Get monthly attendance (employee-wise subcollection structure)
export async function getMonthlyAttendance(year: string, month: string) {
  try {
    const records: AttendanceRecord[] = [];
    
    // Get all employees
    const employeesSnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    // For each employee, get their attendance records
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeName = employeeDoc.id;
      const recordsRef = collection(db, COLLECTION_NAME, employeeName, 'records');
      const recordsSnapshot = await getDocs(recordsRef);
      
      recordsSnapshot.forEach((recordDoc) => {
        const data = recordDoc.data();
        const date = data['01_date'];
        
        // Filter by year-month
        if (date && date.startsWith(`${year}-${month.padStart(2, '0')}`)) {
          records.push({
            id: recordDoc.id,
            employeeName: employeeName,
            date: data['01_date'],
            inTime: data['02_inTime'],
            outTime: data['03_outTime'],
            inLocation: data['04_inLocation'],
            outLocation: data['05_outLocation'],
            totalMinutes: data['06_totalMinutes'],
            totalHours: data['07_totalHours'],
            modifiedBy: data['08_modifiedBy'],
            overtimeMinutes: data['09_overtimeMinutes'],
            overtimePay: data['10_overtimePay'],
            isHoliday: data['11_isHoliday'],
            createdAt: data['12_createdAt']?.toDate(),
          });
        }
      });
    }
    
    // Sort by date descending
    records.sort((a, b) => b.date.localeCompare(a.date));
    
    return records;
  } catch (error) {
    console.error('Error getting monthly attendance:', error);
    throw error;
  }
}

// Delete attendance record (employee-wise subcollection structure)
export async function deleteAttendance(employeeName: string, date: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, employeeName, 'records', date));
    return { success: true };
  } catch (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }
}

// Helper functions
function calculateMinutes(inTime: string, outTime: string): number {
  const parseTime = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const inMinutes = parseTime(inTime);
  const outMinutes = parseTime(outTime);

  let totalMins = outMinutes - inMinutes;
  if (totalMins < 0) totalMins += 24 * 60;

  return totalMins;
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
