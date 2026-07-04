package com.attendance.tracker.data.model

data class User(
    val id: String = "",
    val username: String = "",
    val name: String = "",
    val role: UserRole = UserRole.USER,
    val email: String? = null
)

enum class UserRole {
    ADMIN, USER
}

data class Employee(
    val id: String = "",
    val name: String = "",
    val position: String? = null,
    val role: UserRole = UserRole.USER,
    val status: String = "active",
    val totalWorkingDays: Int? = null,
    val fixedInTime: String? = null,
    val fixedOutTime: String? = null,
    val perMinuteRate: Double? = null,
    val fixedSalary: Double? = null,
    val username: String? = null,
    val email: String? = null
)

data class AttendanceRecord(
    val id: String = "",
    val date: String = "",
    val employeeName: String = "",
    val inTime: String = "",
    val outTime: String = "",
    val inLocation: String = "",
    val outLocation: String = "",
    val totalMinutes: Int = 0,
    val totalHours: String = "",
    val isNightDuty: Boolean = false
)

data class LeaveRecord(
    val id: String = "",
    val employeeName: String = "",
    val leaveType: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reason: String = "",
    val status: LeaveStatus = LeaveStatus.PENDING,
    val appliedDate: String = "",
    val paymentStatus: String? = null,
    val approvedBy: String? = null,
    val approvedDate: String? = null,
    val approvedTime: String? = null
)

enum class LeaveStatus {
    PENDING, APPROVED, REJECTED
}

data class NightDutyRequest(
    val id: String = "",
    val employeeName: String = "",
    val date: String = "",
    val reason: String = "",
    val status: String = "pending",
    val requestedAt: String = "",
    val approvedBy: String? = null
)

data class Notification(
    val id: String = "",
    val userId: String = "",
    val type: String = "",
    val title: String = "",
    val message: String = "",
    val read: Boolean = false,
    val createdAt: String = ""
)

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val user: User,
    val token: String
)
