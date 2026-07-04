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
    private var fixedSalary: Double = 0.0
    var fixedInTime: String = "10:00:00 AM"
    var fixedOutTime: String = "07:00:00 PM"
    
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
                fixedSalary = employee?.fixedSalary ?: 0.0
                fixedInTime = employee?.fixedInTime ?: "10:00:00 AM"
                fixedOutTime = employee?.fixedOutTime ?: "07:00:00 PM"
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
        
        // Count working days in month (excluding Sundays)
        val cal = Calendar.getInstance()
        cal.set(year, month - 1, 1)
        val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
        var workingDaysCount = 0
        for (d in 1..daysInMonth) {
            cal.set(year, month - 1, d)
            if (cal.get(Calendar.DAY_OF_WEEK) != Calendar.SUNDAY) {
                workingDaysCount++
            }
        }

        val dailyRate = if (workingDaysCount > 0) fixedSalary / workingDaysCount else 0.0

        // Calculate actual payable days worked
        var presentPayableDays = 0.0
        filteredRecords.forEach { record ->
            presentPayableDays += getAttendanceDayValue(record, fixedInTime, fixedOutTime)
        }

        // Days missed = workingDaysCount - presentPayableDays
        val deductDays = if (workingDaysCount > presentPayableDays) workingDaysCount - presentPayableDays else 0.0

        // Apply 1 monthly free leave adjustment waiver
        val adjustedDeductDays = if (deductDays > 0.0) {
            val waived = deductDays - 1.0
            if (waived > 0.0) waived else 0.0
        } else {
            0.0
        }

        val totalEarning = if (fixedSalary > 0.0) {
            val net = fixedSalary - (adjustedDeductDays * dailyRate)
            if (net > 0.0) net else 0.0
        } else {
            0.0
        }
        
        _uiState.value = _uiState.value.copy(
            isLoading = false,
            records = filteredRecords,
            totalDays = daysInMonth,
            presentDays = filteredRecords.size,
            totalHours = totalHours,
            totalMinutes = totalMinutes,
            totalEarning = totalEarning,
            perMinuteRate = dailyRate
        )
    }

    private fun getAttendanceDayValue(
        record: AttendanceRecord,
        fixedInTime: String,
        fixedOutTime: String
    ): Double {
        if (record.inTime.isBlank()) return 0.0
        if (record.outTime.isBlank()) return 1.0 // Assume full day if checkout is pending

        val parseTime = { timeStr: String ->
            try {
                val parts = timeStr.split(" ")
                val time = parts[0]
                val period = if (parts.size > 1) parts[1] else "AM"
                val timeParts = time.split(":")
                var hours = timeParts[0].toInt()
                val minutes = if (timeParts.size > 1) timeParts[1].toInt() else 0
                if (period == "PM" && hours != 12) hours += 12
                if (period == "AM" && hours == 12) hours = 0
                hours * 60 + minutes
            } catch (e: Exception) {
                10 * 60
            }
        }

        val checkIsLate = { actualIn: Int, scheduledIn: Int, graceMinutes: Int ->
            var diff = actualIn - scheduledIn
            if (diff < -12 * 60) diff += 24 * 60
            if (diff > 12 * 60) diff -= 24 * 60
            diff > graceMinutes
        }

        return try {
            val recordInMins = parseTime(record.inTime)
            val recordOutMins = parseTime(record.outTime)

            val fixedInMins = parseTime(fixedInTime)
            val fixedOutMins = parseTime(fixedOutTime)

            val isLate = checkIsLate(recordInMins, fixedInMins, 15)

            var workedMinutes = recordOutMins - recordInMins
            if (workedMinutes < 0) workedMinutes += 24 * 60

            var shiftDuration = fixedOutMins - fixedInMins
            if (shiftDuration < 0) shiftDuration += 24 * 60

            val reqFullDayMins = shiftDuration - 15
            val reqHalfDayMins = Math.round(shiftDuration * 5.0 / 9.0).toInt()

            if (workedMinutes < reqHalfDayMins) {
                0.0
            } else if (workedMinutes >= reqFullDayMins && !isLate) {
                1.0
            } else {
                0.5
            }
        } catch (e: Exception) {
            1.0
        }
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
