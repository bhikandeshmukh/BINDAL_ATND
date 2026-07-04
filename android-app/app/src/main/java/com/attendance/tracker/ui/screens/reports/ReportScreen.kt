package com.attendance.tracker.ui.screens.reports

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.tracker.data.model.AttendanceRecord
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.ui.theme.Green

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportScreen(
    userName: String,
    userRole: UserRole,
    viewModel: ReportViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showMonthPicker by remember { mutableStateOf(false) }
    var isEarningVisible by remember { mutableStateOf(true) }
    
    LaunchedEffect(userName) {
        viewModel.initialize(userName, userRole)
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header with Month Selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "📊 ${if (userRole == UserRole.ADMIN) "Reports" else "My Reports"}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            // Month Selector Button
            OutlinedButton(
                onClick = { showMonthPicker = true },
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(
                    Icons.Filled.CalendarMonth,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    "${viewModel.getMonthName(uiState.selectedMonth)} ${uiState.selectedYear}",
                    style = MaterialTheme.typography.bodyMedium
                )
                Icon(
                    Icons.Filled.ArrowDropDown,
                    contentDescription = null
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Summary Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Text(
                    text = "📅 ${viewModel.getMonthName(uiState.selectedMonth)} ${uiState.selectedYear} Summary",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    SummaryItem(
                        label = "Total Days",
                        value = "${uiState.totalDays}",
                        icon = Icons.Filled.CalendarMonth
                    )
                    SummaryItem(
                        label = "Present",
                        value = "${uiState.presentDays}",
                        icon = Icons.Filled.CheckCircle
                    )
                    SummaryItem(
                        label = "Total Hours",
                        value = "${uiState.totalHours}h ${uiState.totalMinutes % 60}m (${uiState.totalMinutes}m)",
                        icon = Icons.Filled.AccessTime
                    )
                }
                
                // Total Earning Section
                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "💰 Monthly Salary: ",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = if (isEarningVisible) "₹${String.format("%,.2f", uiState.totalEarning)}" else "₹ ••••••",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Green
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = { isEarningVisible = !isEarningVisible },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = if (isEarningVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                            contentDescription = if (isEarningVisible) "Hide earning" else "Show earning",
                            tint = Green,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                
                if (uiState.perMinuteRate > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (isEarningVisible) "Rate: ₹${String.format("%.2f", uiState.perMinuteRate)}/day" else "Rate: ₹ ••••/day",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "📋 Daily Attendance (${uiState.records.size} days)",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(12.dp))
        
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (uiState.records.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("📭", style = MaterialTheme.typography.displayLarge)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "No attendance records for ${viewModel.getMonthName(uiState.selectedMonth)}",
                        color = Color.Gray
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.records) { record ->
                    AttendanceHistoryItem(
                        record = record,
                        dailyRate = uiState.perMinuteRate,
                        fixedInTime = viewModel.fixedInTime,
                        fixedOutTime = viewModel.fixedOutTime,
                        isEarningVisible = isEarningVisible
                    )
                }
            }
        }
    }
    
    // Month Picker Dialog
    if (showMonthPicker) {
        AlertDialog(
            onDismissRequest = { showMonthPicker = false },
            title = { Text("Select Month") },
            text = {
                LazyColumn {
                    items(uiState.availableMonths) { (year, month) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.selectMonth(year, month)
                                    showMonthPicker = false
                                }
                                .padding(vertical = 12.dp, horizontal = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${viewModel.getMonthName(month)} $year",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = if (year == uiState.selectedYear && month == uiState.selectedMonth) 
                                    FontWeight.Bold else FontWeight.Normal,
                                color = if (year == uiState.selectedYear && month == uiState.selectedMonth) 
                                    Color(0xFF2563EB) else Color.Unspecified
                            )
                            if (year == uiState.selectedYear && month == uiState.selectedMonth) {
                                Icon(
                                    Icons.Filled.Check,
                                    contentDescription = null,
                                    tint = Color(0xFF2563EB)
                                )
                            }
                        }
                        Divider()
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showMonthPicker = false }) {
                    Text("Close")
                }
            }
        )
    }
}

@Composable
fun SummaryItem(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF2563EB),
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = Color.Gray
        )
    }
}

@Composable
fun AttendanceHistoryItem(
    record: AttendanceRecord,
    dailyRate: Double,
    fixedInTime: String,
    fixedOutTime: String,
    isEarningVisible: Boolean = true
) {
    val parseTime = { timeStr: String ->
        try {
            val cleanStr = timeStr.trim()
            val parts = cleanStr.split(Regex("\\s+"))
            val rawTime = parts[0]
            val period = if (parts.size > 1) parts[1] else "AM"
            val normalizedTime = rawTime.replace(".", ":")
            val timeParts = normalizedTime.split(":")
            var hours = timeParts[0].toInt()
            val minutes = if (timeParts.size > 1) timeParts[1].toInt() else 0
            val normalizedPeriod = period.uppercase(Locale.US)
            if (normalizedPeriod == "PM" && hours != 12) hours += 12
            if (normalizedPeriod == "AM" && hours == 12) hours = 0
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

    val dayValue = try {
        if (record.inTime.isBlank()) 0.0
        else if (record.outTime.isBlank()) 1.0 // Assume full day if checkout is pending
        else {
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
        }
    } catch (e: Exception) {
        1.0
    }

    val dayEarning = dailyRate * dayValue
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = record.date,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Filled.Login,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = Green
                    )
                    Text(
                        text = " ${record.inTime}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        Icons.Filled.Logout,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = Color(0xFFDC2626)
                    )
                    Text(
                        text = " ${record.outTime.ifEmpty { "--:--" }}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            }
            
            Column(horizontalAlignment = Alignment.End) {
                // Working Hours with total minutes
                Text(
                    text = "${record.totalMinutes / 60}h ${record.totalMinutes % 60}m (${record.totalMinutes}m)",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF2563EB)
                )
                
                // Day Earning
                if (dailyRate > 0.0 && record.inTime.isNotBlank()) {
                    Text(
                        text = if (isEarningVisible) "₹${String.format("%,.2f", dayEarning)}" else "₹ ••••",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = Green
                    )
                    Text(
                        text = if (dayValue == 1.0) "Full Day" else if (dayValue == 0.5) "Half Day" else "Absent",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (dayValue == 1.0) Green else if (dayValue == 0.5) Color(0xFF2563EB) else Color(0xFFDC2626)
                    )
                }
                
                if (record.isNightDuty) {
                    Text(
                        text = "🌙 Night",
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
        }
    }
}
