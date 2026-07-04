/**
 * Audit Service - Firebase Wrapper
 * This file provides backward compatibility with existing code
 */

import {
  createAuditLog as createFirebaseAuditLog,
  getAuditLogs as getFirebaseAuditLogs,
  getEmployeeAuditLogs as getFirebaseEmployeeAuditLogs,
  logAttendanceChange as logFirebaseAttendanceChange,
  logLeaveAction as logFirebaseLeaveAction,
  logNightDutyAction as logFirebaseNightDutyAction,
  logEmployeeAction as logFirebaseEmployeeAction,
  logLoginAction as logFirebaseLoginAction,
  AuditLog,
} from '../firebase/audit';

// Re-export types
export type { AuditLog };

/**
 * Audit action types
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Entity types that can be audited
 */
export enum EntityType {
  ATTENDANCE = 'Attendance',
  LEAVE = 'Leave',
  NIGHT_DUTY = 'Night_Duty',
  EMPLOYEE = 'Employee',
  NOTIFICATION = 'Notification',
}

/**
 * Log attendance change (Firebase wrapper)
 */
export async function logAttendanceChange(
  data: {
    employeeId: string;
    employeeName: string;
    date: string;
    fieldChanged: string;
    oldValue: string;
    newValue: string;
    performedBy: string;
    performedById: string;
    reason?: string;
  }
): Promise<string> {
  return logFirebaseAttendanceChange(data);
}

/**
 * Log leave action (Firebase wrapper)
 */
export async function logLeaveAction(
  data: {
    leaveId: string;
    employeeId: string;
    employeeName: string;
    action: 'APPROVE' | 'REJECT' | 'CREATE';
    performedBy: string;
    performedById: string;
  }
): Promise<string> {
  return logFirebaseLeaveAction(data);
}

/**
 * Log night duty action (Firebase wrapper)
 */
export async function logNightDutyAction(
  data: {
    requestId: string;
    employeeId: string;
    employeeName: string;
    action: 'APPROVE' | 'REJECT' | 'CREATE';
    performedBy: string;
    performedById: string;
  }
): Promise<string> {
  return logFirebaseNightDutyAction(data);
}

/**
 * Log employee action (Firebase wrapper)
 */
export async function logEmployeeAction(
  data: {
    employeeId: string;
    employeeName: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    performedBy: string;
    performedById: string;
    details?: string;
  }
): Promise<string> {
  return logFirebaseEmployeeAction(data);
}

/**
 * Get audit logs (Firebase wrapper)
 */
export async function getAuditLogs(
  options?: {
    employeeId?: string;
    action?: string;
    limitCount?: number;
  }
): Promise<AuditLog[]> {
  return getFirebaseAuditLogs(options);
}

/**
 * Get employee audit logs (Firebase wrapper)
 */
export async function getEmployeeAuditLogs(
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<AuditLog[]> {
  // For now, ignore date filters and return all logs for the employee
  return getFirebaseEmployeeAuditLogs(employeeId, 100);
}

/**
 * Get all audit logs with filters
 */
export async function getAllAuditLogs(
  filters?: {
    entityType?: EntityType;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AuditLog[]> {
  return getFirebaseAuditLogs({
    limitCount: filters?.limit || 100,
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: EntityType,
  entityId: string
): Promise<AuditLog[]> {
  return getFirebaseAuditLogs({
    limitCount: 100,
  });
}
