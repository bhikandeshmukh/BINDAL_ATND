package com.attendance.tracker.ui.screens.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.attendance.tracker.data.model.AttendanceRecord
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.data.repository.AttendanceRepository
import com.attendance.tracker.data.repository.EmployeeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class ReportUiState(
    val isLoading: Boolean = false,
    val records: List<AttendanceRecord> = emptyList(),
    val totalDays: Int = 0,
    val presentDays: Int = 0,
    val totalHours: Int = 0,
    val totalMinutes: Int = 0,
    val totalEarning: Double = 0.0,
    val perMinuteRate: Double = 0.0,
    val selectedMonth: Int = 0,
    val selectedYear: Int = 0,
    val availableMonths: List<Pair<Int, Int>> = emptyList(), // List of (year, month)
    val error: String? = null
)

@HiltViewModel
class ReportViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val employeeRepository: EmployeeRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ReportUiState())
    val uiState: StateFlow<ReportUiState> = _uiState.asStateFlow()
    
    private var userName: String = ""
    private var userRole: UserRole = UserRole.USER
    private var allRecords: List<AttendanceRecord> = emptyList()
    private var perMinuteRate: Double = 0.0
    
    private val calendar = Calendar.getInstance()
    
    fun initialize(name: String, role: UserRole) {
        userName = name
        userRole = role
        
        // Set current month/year
        _uiState.value = _uiState.value.copy(
            selectedMonth = calendar.get(Calendar.MONTH) + 1,
            selectedYear = calendar.get(Calendar.YEAR)
        )
        
        loadEmployeeRate()
        loadReports()
    }
    
    private fun loadEmployeeRate() {
        viewModelScope.launch {
            val result = employeeRepository.getEmployees()
            result.onSuccess { employees ->
                val employee = employees.find { it.name == userName }
                perMinuteRate = employee?.perMinuteRate ?: 0.0
                _uiState.value = _uiState.value.copy(perMinuteRate = perMinuteRate)
            }
        }
    }
    
    private fun loadReports() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val result = attendanceRepository.getAttendance()
            
            result.fold(
                onSuccess = { records ->
                    // Filter by user if not admin
                    allRecords = if (userRole == UserRole.USER) {
                        records.filter { it.employeeName == userName }
                    } else {
                        records
                    }
                    
                    // Get available months from records
                    val availableMonths = getAvailableMonths(allRecords)
                    _uiState.value = _uiState.value.copy(availableMonths = availableMonths)
                    
                    // Filter and calculate for selected month
                    filterByMonth(_uiState.value.selectedYear, _uiState.value.selectedMonth)
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
    
    fun selectMonth(year: Int, month: Int) {
        _uiState.value = _uiState.value.copy(
            selectedYear = year,
            selectedMonth = month
        )
        filterByMonth(year, month)
    }
    
    private fun filterByMonth(year: Int, month: Int) {
        val monthStr = String.format("%04d-%02d", year, month)
        
        val filteredRecords = allRecords.filter { record ->
            record.date.startsWith(monthStr)
        }.sortedByDescending { it.date }
        
        val totalMinutes = filteredRecords.sumOf { it.totalMinutes }
        val totalHours = totalMinutes / 60
        val totalEarning = totalMinutes * perMinuteRate
        
        // Get days in selected month
        val cal = Calendar.getInstance()
        cal.set(year, month - 1, 1)
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            records = filteredRecords,
            totalDays = daysInMonth,
            presentDays = filteredRecords.size,
            totalHours = totalHours,
            totalMinutes = totalMinutes,
            totalEarning = totalEarning
        )
    }
    
    private fun getAvailableMonths(records: List<AttendanceRecord>): List<Pair<Int, Int>> {
        val months = mutableSetOf<Pair<Int, Int>>()
        
        // Add current month
        months.add(Pair(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1))
        
        // Add months from records
        records.forEach { record ->
            try {
                val parts = record.date.split("-")
                if (parts.size >= 2) {
                    val year = parts[0].toInt()
                    val month = parts[1].toInt()
                    months.add(Pair(year, month))
                }
            } catch (e: Exception) {
                // Skip invalid dates
            }
        }
        
        // Sort by year and month descending
        return months.sortedWith(compareByDescending<Pair<Int, Int>> { it.first }.thenByDescending { it.second })
    }
    
    fun getMonthName(month: Int): String {
        return when (month) {
            1 -> "January"
            2 -> "February"
            3 -> "March"
            4 -> "April"
            5 -> "May"
            6 -> "June"
            7 -> "July"
            8 -> "August"
            9 -> "September"
            10 -> "October"
            11 -> "November"
            12 -> "December"
            else -> ""
        }
    }
}
