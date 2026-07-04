package com.attendance.tracker.data.repository

import com.attendance.tracker.data.firebase.FirebaseRepository
import com.attendance.tracker.data.model.LeaveRecord
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LeaveRepository @Inject constructor(
    private val firebaseRepository: FirebaseRepository
) {
    suspend fun getLeaves(): Result<List<LeaveRecord>> {
        return firebaseRepository.getLeaves()
    }
    
    suspend fun applyLeave(
        employeeName: String,
        leaveType: String,
        startDate: String,
        endDate: String,
        reason: String
    ): Result<LeaveRecord> {
        return firebaseRepository.applyLeave(employeeName, leaveType, startDate, endDate, reason)
    }
    
    suspend fun updateLeaveStatus(
        id: String,
        status: String,
        paymentStatus: String? = null,
        approvedBy: String? = null
    ): Result<LeaveRecord> {
        return firebaseRepository.updateLeaveStatus(id, status, approvedBy)
    }
}
