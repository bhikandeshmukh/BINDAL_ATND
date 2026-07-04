package com.attendance.tracker.ui.screens.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.api.ApiService
import com.attendance.tracker.data.model.Notification
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationUiState(
    val isLoading: Boolean = false,
    val notifications: List<Notification> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(NotificationUiState())
    val uiState: StateFlow<NotificationUiState> = _uiState.asStateFlow()
    
    fun loadNotifications(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                val response = apiService.getNotifications(userId)
                if (response.isSuccessful) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        notifications = response.body()?.sortedByDescending { it.createdAt } ?: emptyList()
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Failed to load notifications"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }
    
    fun markAsRead(notificationId: String, userId: String) {
        viewModelScope.launch {
            try {
                apiService.markNotificationRead(notificationId)
                _uiState.value = _uiState.value.copy(
                    notifications = _uiState.value.notifications.map {
                        if (it.id == notificationId) it.copy(read = true) else it
                    }
                )
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun markAllAsRead(userId: String) {
        viewModelScope.launch {
            try {
                apiService.markAllNotificationsRead(mapOf("userId" to userId))
                _uiState.value = _uiState.value.copy(
                    notifications = _uiState.value.notifications.map { it.copy(read = true) }
                )
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
    
    fun deleteNotification(notificationId: String) {
        _uiState.value = _uiState.value.copy(
            notifications = _uiState.value.notifications.filter { it.id != notificationId }
        )
    }
}
