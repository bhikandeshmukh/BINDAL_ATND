package com.attendance.tracker.ui.screens.leaves

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.model.LeaveRecord
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.data.repository.LeaveRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LeaveUiState(
    val isLoading: Boolean = false,
    val leaves: List<LeaveRecord> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class LeaveViewModel @Inject constructor(
    private val leaveRepository: LeaveRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(LeaveUiState())
    val uiState: StateFlow<LeaveUiState> = _uiState.asStateFlow()
    
    private var userName: String = ""
    private var userRole: UserRole = UserRole.USER
    
    fun initialize(name: String, role: UserRole) {
        userName = name
        userRole = role
        loadLeaves()
    }
    
    private fun loadLeaves() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = leaveRepository.getLeaves()
            
            result.fold(
                onSuccess = { leaves ->
                    val filteredLeaves = if (userRole == UserRole.USER) {
                        leaves.filter { it.employeeName == userName }
                    } else {
                        leaves
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        leaves = filteredLeaves.sortedByDescending { it.appliedDate }
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
            )
        }
    }
    
    fun applyLeave(leaveType: String, startDate: String, endDate: String, reason: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = leaveRepository.applyLeave(
                employeeName = userName,
                leaveType = leaveType,
                startDate = startDate,
                endDate = endDate,
                reason = reason
            )
            
            result.fold(
                onSuccess = { loadLeaves() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
            )
        }
    }
    
    fun updateLeaveStatus(id: String, status: String) {
        viewModelScope.launch {
            val result = leaveRepository.updateLeaveStatus(
                id = id,
                status = status,
                approvedBy = "Admin: $userName"
            )
            
            result.fold(
                onSuccess = { loadLeaves() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }
            )
        }
    }
}
