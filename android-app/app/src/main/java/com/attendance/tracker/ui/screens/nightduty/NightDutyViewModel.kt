package com.attendance.tracker.ui.screens.nightduty

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.model.NightDutyRequest
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.data.repository.NightDutyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NightDutyUiState(
    val isLoading: Boolean = false,
    val requests: List<NightDutyRequest> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class NightDutyViewModel @Inject constructor(
    private val nightDutyRepository: NightDutyRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(NightDutyUiState())
    val uiState: StateFlow<NightDutyUiState> = _uiState.asStateFlow()
    
    private var userName: String = ""
    private var userRole: UserRole = UserRole.USER
    
    fun initialize(name: String, role: UserRole) {
        userName = name
        userRole = role
        loadRequests()
    }
    
    private fun loadRequests() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = nightDutyRepository.getNightDutyRequests()
            
            result.fold(
                onSuccess = { requests ->
                    val filteredRequests = if (userRole == UserRole.USER) {
                        requests.filter { it.employeeName == userName }
                    } else {
                        requests
                    }
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        requests = filteredRequests.sortedByDescending { it.requestedAt }
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
    
    fun requestNightDuty(date: String, reason: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = nightDutyRepository.requestNightDuty(
                employeeName = userName,
                date = date,
                reason = reason
            )
            
            result.fold(
                onSuccess = { loadRequests() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
            )
        }
    }
    
    fun updateStatus(id: String, status: String) {
        viewModelScope.launch {
            val result = nightDutyRepository.updateNightDutyStatus(
                id = id,
                status = status,
                approvedBy = "Admin: $userName"
            )
            
            result.fold(
                onSuccess = { loadRequests() },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }
            )
        }
    }
}
