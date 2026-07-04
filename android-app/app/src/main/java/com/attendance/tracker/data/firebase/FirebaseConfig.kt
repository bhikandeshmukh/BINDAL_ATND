package com.attendance.tracker.data.firebase

object FirebaseConfig {
    const val PROJECT_ID = "atdn-ec598"
    const val DATABASE_URL = "https://atdn-ec598-default-rtdb.asia-southeast1.firebasedatabase.app"
    const val STORAGE_BUCKET = "atdn-ec598.firebasestorage.app"
    
    // Collections (matching Next.js app structure)
    const val EMPLOYEES_COLLECTION = "employees"
    const val ATTENDANCE_COLLECTION = "attendance"
    const val LEAVES_COLLECTION = "leaveRequests"
    const val NIGHT_DUTY_COLLECTION = "nightDuty"
    const val NOTIFICATIONS_COLLECTION = "notifications"
    
    // Subcollection names
    const val RECORDS_SUBCOLLECTION = "records"
    const val REQUESTS_SUBCOLLECTION = "requests"
    
    // Employee field names (numbered prefix format)
    object EmployeeFields {
        const val ID = "01_id"
        const val NAME = "02_name"
        const val POSITION = "03_position"
        const val ROLE = "04_role"
        const val STATUS = "05_status"
        const val TOTAL_WORKING_DAYS = "06_totalWorkingDays"
        const val FIXED_IN_TIME = "07_fixedInTime"
        const val FIXED_OUT_TIME = "08_fixedOutTime"
        const val PER_MINUTE_RATE = "09_perMinuteRate"
        const val FIXED_SALARY = "10_fixedSalary"
        const val USERNAME = "11_username"
        const val PASSWORD = "12_password"
        const val EMAIL = "13_email"
        const val CREATED_AT = "14_createdAt"
    }
    
    // Attendance field names
    object AttendanceFields {
        const val DATE = "01_date"
        const val IN_TIME = "02_inTime"
        const val OUT_TIME = "03_outTime"
        const val IN_LOCATION = "04_inLocation"
        const val OUT_LOCATION = "05_outLocation"
        const val TOTAL_MINUTES = "06_totalMinutes"
        const val TOTAL_HOURS = "07_totalHours"
        const val MODIFIED_BY = "08_modifiedBy"
        const val OVERTIME_MINUTES = "09_overtimeMinutes"
        const val OVERTIME_PAY = "10_overtimePay"
        const val IS_HOLIDAY = "11_isHoliday"
        const val CREATED_AT = "12_createdAt"
    }
    
    // Leave field names
    object LeaveFields {
        const val LEAVE_TYPE = "02_leaveType"
        const val START_DATE = "03_startDate"
        const val END_DATE = "04_endDate"
        const val REASON = "05_reason"
        const val STATUS = "06_status"
        const val PAYMENT_STATUS = "07_paymentStatus"
        const val APPLIED_DATE = "08_appliedDate"
        const val APPROVED_BY = "09_approvedBy"
        const val APPROVED_DATE = "10_approvedDate"
        const val APPROVED_TIME = "11_approvedTime"
        const val CREATED_AT = "12_createdAt"
    }
    
    // Night Duty field names
    object NightDutyFields {
        const val DATE = "02_date"
        const val START_TIME = "03_startTime"
        const val END_TIME = "04_endTime"
        const val REASON = "05_reason"
        const val STATUS = "06_status"
        const val APPLIED_DATE = "07_appliedDate"
        const val REQUESTED_TIME = "08_requestedTime"
        const val REQUESTED_BY = "09_requestedBy"
        const val APPROVED_BY = "10_approvedBy"
        const val APPROVED_DATE = "11_approvedDate"
        const val APPROVED_TIME = "12_approvedTime"
        const val CREATED_AT = "13_createdAt"
    }
}
