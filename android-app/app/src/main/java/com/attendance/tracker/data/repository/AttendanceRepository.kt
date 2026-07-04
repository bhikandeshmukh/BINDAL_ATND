package com.attendance.tracker.data.repository

import com.attendance.tracker.data.firebase.FirebaseRepository
import com.attendance.tracker.data.model.AttendanceRecord
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepository @Inject constructor(
    private val firebaseRepository: FirebaseRepository
) {
    suspend fun getAttendance(): Result<List<AttendanceRecord>> {
        return firebaseRepository.getAttendance()
    }
    
    suspend fun checkIn(
        employeeName: String,
        date: String,
        inTime: String,
        inLocation: String,
        isNightDuty: Boolean = false
    ): Result<AttendanceRecord> {
        return firebaseRepository.checkIn(employeeName, date, inTime, inLocation, isNightDuty)
    }
    
    suspend fun checkOut(
        employeeName: String,
        date: String,
        outTime: String,
        outLocation: String,
        isNightDuty: Boolean = false
    ): Result<AttendanceRecord> {
        return firebaseRepository.checkOut(employeeName, date, outTime, outLocation)
    }
    
    suspend fun getAttendanceStatus(employeeName: String, date: String): Result<Map<String, Any>> {
        return try {
            val record = firebaseRepository.getAttendanceByEmployee(employeeName, date)
            if (record != null) {
                Result.success(mapOf(
                    "hasCheckedIn" to true,
                    "hasCheckedOut" to record.outTime.isNotEmpty(),
                    "inTime" to record.inTime,
                    "outTime" to record.outTime,
                    "inLocation" to record.inLocation,
                    "outLocation" to record.outLocation
                ))
            } else {
                Result.success(mapOf(
                    "hasCheckedIn" to false,
                    "hasCheckedOut" to false
                ))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getMonthlyAttendance(employeeName: String): Result<List<AttendanceRecord>> {
        return firebaseRepository.getAttendanceByEmployeeName(employeeName)
    }
}
