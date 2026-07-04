package com.attendance.tracker.ui.screens.attendance

import android.annotation.SuppressLint
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.model.AttendanceRecord
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.data.repository.AttendanceRepository
import com.attendance.tracker.data.repository.EmployeeRepository
import com.google.android.gms.location.FusedLocationProviderClient
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class AttendanceUiState(
    val isLoading: Boolean = false,
    val isCheckedIn: Boolean = false,
    val isCheckedOut: Boolean = false,
    val inTime: String = "",
    val outTime: String = "",
    val inLocation: String = "",
    val outLocation: String = "",
    val currentDate: String = "",
    val message: String = "",
    val perMinuteRate: Double = 0.0,
    val recentRecords: List<AttendanceRecord> = emptyList(),
    // Overtime Tracker
    val workingDaysTarget: Int = 26,
    val dailyMinutesTarget: Int = 600,
    val monthlyTargetMinutes: Int = 15600, // 26 * 600
    val monthlyWorkedMinutes: Int = 0,
    val daysWorked: Int = 0,
    val daysRemaining: Int = 0,
    val deficitMinutes: Int = 0,
    val overtimeRequired: Int = 0
)

@HiltViewModel
class AttendanceViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val employeeRepository: EmployeeRepository,
    private val fusedLocationClient: FusedLocationProviderClient,
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AttendanceUiState())
    val uiState: StateFlow<AttendanceUiState> = _uiState.asStateFlow()
    
    private var userName: String = ""
    private var userRole: UserRole = UserRole.USER
    
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("hh:mm:ss a", Locale.getDefault())
    
    fun initialize(name: String, role: UserRole) {
        userName = name
        userRole = role
        
        val today = dateFormat.format(Date())
        _uiState.value = _uiState.value.copy(currentDate = today)
        
        checkAttendanceStatus()
        loadEmployeeData()
        loadMonthlyOvertimeData()
        
        if (role == UserRole.ADMIN) {
            loadRecentRecords()
        }
    }
    
    private fun checkAttendanceStatus() {
        viewModelScope.launch {
            val today = dateFormat.format(Date())
            val result = attendanceRepository.getAttendanceStatus(userName, today)
            
            result.onSuccess { status ->
                val hasCheckedIn = status["hasCheckedIn"] as? Boolean ?: false
                val hasCheckedOut = status["hasCheckedOut"] as? Boolean ?: false
                
                _uiState.value = _uiState.value.copy(
                    isCheckedIn = hasCheckedIn,
                    isCheckedOut = hasCheckedOut,
                    inTime = status["inTime"] as? String ?: "",
                    outTime = status["outTime"] as? String ?: "",
                    inLocation = status["inLocation"] as? String ?: "",
                    outLocation = status["outLocation"] as? String ?: "",
                    message = when {
                        hasCheckedIn && hasCheckedOut -> "✅ Attendance complete for today!"
                        hasCheckedIn -> "✅ Checked in. Don't forget to check out!"
                        else -> ""
                    }
                )
            }
        }
    }
    
    private fun loadEmployeeData() {
        viewModelScope.launch {
            val result = employeeRepository.getEmployees()
            result.onSuccess { employees ->
                val employee = employees.find { it.name == userName }
                employee?.let {
                    _uiState.value = _uiState.value.copy(
                        perMinuteRate = it.perMinuteRate ?: 0.0
                    )
                }
            }
        }
    }
    
    private fun loadRecentRecords() {
        viewModelScope.launch {
            val result = attendanceRepository.getAttendance()
            result.onSuccess { records ->
                _uiState.value = _uiState.value.copy(
                    recentRecords = records.sortedByDescending { it.date }
                )
            }
        }
    }
    
    private fun loadMonthlyOvertimeData() {
        viewModelScope.launch {
            val result = attendanceRepository.getMonthlyAttendance(userName)
            result.onSuccess { records ->
                val calendar = Calendar.getInstance()
                val currentMonth = calendar.get(Calendar.MONTH)
                val currentYear = calendar.get(Calendar.YEAR)
                val currentDay = calendar.get(Calendar.DAY_OF_MONTH)
                
                // Filter records for current month
                val monthlyRecords = records.filter { record ->
                    try {
                        val recordDate = dateFormat.parse(record.date)
                        val recordCal = Calendar.getInstance()
                        recordCal.time = recordDate!!
                        recordCal.get(Calendar.MONTH) == currentMonth && 
                        recordCal.get(Calendar.YEAR) == currentYear
                    } catch (e: Exception) {
                        false
                    }
                }
                
                // Calculate total worked minutes this month
                val totalWorkedMinutes = monthlyRecords.sumOf { it.totalMinutes }
                val daysWorked = monthlyRecords.size
                
                // Calculate expected minutes till today
                // Assuming working days = min(currentDay, 26)
                val workingDaysTillNow = minOf(currentDay, 26)
                val expectedMinutesTillNow = workingDaysTillNow * 600
                
                // Calculate deficit
                val deficit = expectedMinutesTillNow - totalWorkedMinutes
                
                // Days remaining in month (assuming 26 working days)
                val daysRemaining = maxOf(0, 26 - daysWorked)
                
                // Overtime required per remaining day to cover deficit
                val overtimePerDay = if (daysRemaining > 0 && deficit > 0) {
                    deficit / daysRemaining
                } else {
                    0
                }
                
                _uiState.value = _uiState.value.copy(
                    monthlyWorkedMinutes = totalWorkedMinutes,
                    daysWorked = daysWorked,
                    daysRemaining = daysRemaining,
                    deficitMinutes = maxOf(0, deficit),
                    overtimeRequired = overtimePerDay
                )
            }
        }
    }
    
    @SuppressLint("MissingPermission")
    fun checkIn() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, message = "")
            
            try {
                // Get current location
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    viewModelScope.launch {
                        val locationString = if (location != null) {
                            "${location.latitude}, ${location.longitude}"
                        } else {
                            "Location unavailable"
                        }
                        
                        val today = dateFormat.format(Date())
                        val currentTime = timeFormat.format(Date()).uppercase()
                        
                        val result = attendanceRepository.checkIn(
                            employeeName = userName,
                            date = today,
                            inTime = currentTime,
                            inLocation = locationString
                        )
                        
                        result.fold(
                            onSuccess = {
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    isCheckedIn = true,
                                    inTime = currentTime,
                                    inLocation = locationString,
                                    message = "✅ Check In successful at $currentTime"
                                )
                            },
                            onFailure = { e ->
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    message = "❌ ${e.message}"
                                )
                            }
                        )
                    }
                }.addOnFailureListener {
                    viewModelScope.launch {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            message = "❌ Failed to get location"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    message = "❌ ${e.message}"
                )
            }
        }
    }
    
    @SuppressLint("MissingPermission")
    fun checkOut() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, message = "")
            
            try {
                fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                    viewModelScope.launch {
                        val locationString = if (location != null) {
                            "${location.latitude}, ${location.longitude}"
                        } else {
                            "Location unavailable"
                        }
                        
                        val today = dateFormat.format(Date())
                        val currentTime = timeFormat.format(Date()).uppercase()
                        
                        val result = attendanceRepository.checkOut(
                            employeeName = userName,
                            date = today,
                            outTime = currentTime,
                            outLocation = locationString
                        )
                        
                        result.fold(
                            onSuccess = {
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    isCheckedOut = true,
                                    outTime = currentTime,
                                    outLocation = locationString,
                                    message = "✅ Check Out successful at $currentTime"
                                )
                            },
                            onFailure = { e ->
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    message = "❌ ${e.message}"
                                )
                            }
                        )
                    }
                }.addOnFailureListener {
                    viewModelScope.launch {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            message = "❌ Failed to get location"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    message = "❌ ${e.message}"
                )
            }
        }
    }
}
