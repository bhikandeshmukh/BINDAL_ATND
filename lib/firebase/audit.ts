/**
 * Firebase Firestore - Audit Logs Operations
 */

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp,
    limit,
} from 'firebase/firestore';
import { db } from './config';

export interface AuditLog {
    id?: string;
    action: string;
    performedBy: string;
    performedById: string;
    employeeId?: string;
    employeeName?: string;
    details?: string;
    oldValue?: string;
    newValue?: string;
    timestamp?: Date;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, 'auditLogs'), {
            '01_action': logData.action,
            '02_performedBy': logData.performedBy,
            '03_performedById': logData.performedById,
            '04_employeeId': logData.employeeId || '',
            '05_employeeName': logData.employeeName || '',
            '06_details': logData.details || '',
            '07_oldValue': logData.oldValue || '',
            '08_newValue': logData.newValue || '',
            '09_ipAddress': logData.ipAddress || '',
            '10_userAgent': logData.userAgent || '',
            '11_timestamp': Timestamp.now(),
        });

        return docRef.id;
    } catch (error) {
        console.error('Error creating audit log:', error);
        throw error;
    }
}

/**
 * Get all audit logs (with optional filters)
 */
export async function getAuditLogs(options?: {
    employeeId?: string;
    action?: string;
    limitCount?: number;
}): Promise<AuditLog[]> {
    try {
        let q = query(
            collection(db, 'auditLogs'),
            orderBy('11_timestamp', 'desc')
        );

        if (options?.employeeId) {
            q = query(q, where('04_employeeId', '==', options.employeeId));
        }

        if (options?.action) {
            q = query(q, where('01_action', '==', options.action));
        }

        if (options?.limitCount) {
            q = query(q, limit(options.limitCount));
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                action: data['01_action'] || '',
                performedBy: data['02_performedBy'] || '',
                performedById: data['03_performedById'] || '',
                employeeId: data['04_employeeId'] || '',
                employeeName: data['05_employeeName'] || '',
                details: data['06_details'] || '',
                oldValue: data['07_oldValue'] || '',
                newValue: data['08_newValue'] || '',
                ipAddress: data['09_ipAddress'] || '',
                userAgent: data['10_userAgent'] || '',
                timestamp: data['11_timestamp']?.toDate(),
            };
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
    }
}

/**
 * Get audit logs for a specific employee
 */
export async function getEmployeeAuditLogs(employeeId: string, limitCount: number = 50): Promise<AuditLog[]> {
    return getAuditLogs({ employeeId, limitCount });
}

/**
 * Log attendance change
 */
export async function logAttendanceChange(data: {
    employeeId: string;
    employeeName: string;
    date: string;
    fieldChanged: string;
    oldValue: string;
    newValue: string;
    performedBy: string;
    performedById: string;
    reason?: string;
}): Promise<string> {
    return createAuditLog({
        action: 'ATTENDANCE_MODIFIED',
        performedBy: data.performedBy,
        performedById: data.performedById,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        details: `Modified ${data.fieldChanged} for ${data.date}${data.reason ? ` - Reason: ${data.reason}` : ''}`,
        oldValue: data.oldValue,
        newValue: data.newValue,
    });
}

/**
 * Log leave action
 */
export async function logLeaveAction(data: {
    leaveId: string;
    employeeId: string;
    employeeName: string;
    action: 'APPROVE' | 'REJECT' | 'CREATE';
    performedBy: string;
    performedById: string;
}): Promise<string> {
    return createAuditLog({
        action: `LEAVE_${data.action}`,
        performedBy: data.performedBy,
        performedById: data.performedById,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        details: `Leave request ${data.action.toLowerCase()}d for ${data.employeeName}`,
    });
}

/**
 * Log night duty action
 */
export async function logNightDutyAction(data: {
    requestId: string;
    employeeId: string;
    employeeName: string;
    action: 'APPROVE' | 'REJECT' | 'CREATE';
    performedBy: string;
    performedById: string;
}): Promise<string> {
    return createAuditLog({
        action: `NIGHT_DUTY_${data.action}`,
        performedBy: data.performedBy,
        performedById: data.performedById,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        details: `Night duty request ${data.action.toLowerCase()}d for ${data.employeeName}`,
    });
}

/**
 * Log employee action
 */
export async function logEmployeeAction(data: {
    employeeId: string;
    employeeName: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    performedBy: string;
    performedById: string;
    details?: string;
}): Promise<string> {
    return createAuditLog({
        action: `EMPLOYEE_${data.action}`,
        performedBy: data.performedBy,
        performedById: data.performedById,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        details: data.details || `Employee ${data.action.toLowerCase()}d: ${data.employeeName}`,
    });
}

/**
 * Log login action
 */
export async function logLoginAction(data: {
    employeeId: string;
    employeeName: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
}): Promise<string> {
    return createAuditLog({
        action: data.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        performedBy: data.employeeName,
        performedById: data.employeeId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        details: `Login ${data.success ? 'successful' : 'failed'}`,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
    });
}
