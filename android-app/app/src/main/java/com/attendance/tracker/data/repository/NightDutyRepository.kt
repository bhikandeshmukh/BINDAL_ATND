package com.attendance.tracker.data.repository

import com.attendance.tracker.data.firebase.FirebaseRepository
import com.attendance.tracker.data.model.NightDutyRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NightDutyRepository @Inject constructor(
    private val firebaseRepository: FirebaseRepository
) {
    suspend fun getNightDutyRequests(): Result<List<NightDutyRequest>> {
        return firebaseRepository.getNightDutyRequests()
    }
    
    suspend fun requestNightDuty(
        employeeName: String,
        date: String,
        reason: String
    ): Result<NightDutyRequest> {
        return firebaseRepository.requestNightDuty(employeeName, date, reason)
    }
    
    suspend fun updateNightDutyStatus(
        id: String,
        status: String,
        approvedBy: String? = null
    ): Result<NightDutyRequest> {
        return firebaseRepository.updateNightDutyStatus(id, status, approvedBy)
    }
}
