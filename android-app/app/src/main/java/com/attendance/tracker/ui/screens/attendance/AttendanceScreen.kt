package com.attendance.tracker.ui.screens.attendance

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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.ui.theme.Green
import com.attendance.tracker.ui.theme.Red
import java.util.*

@Composable
fun AttendanceScreen(
    userName: String,
    userRole: UserRole,
    viewModel: AttendanceViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(userName) {
        viewModel.initialize(userName, userRole)
    }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Check In/Out Card
        item {
            AttendanceActionCard(
                uiState = uiState,
                onCheckIn = { viewModel.checkIn() },
                onCheckOut = { viewModel.checkOut() }
            )
        }
        
        // Today's Earning Card - Show when checked in (live) or after checkout (final)
        if (uiState.isCheckedIn) {
            item {
                if (uiState.isCheckedOut) {
                    // Show final earning after checkout
                    TodayEarningCard(
                        inTime = uiState.inTime,
                        outTime = uiState.outTime,
                        perMinuteRate = uiState.perMinuteRate
                    )
                } else {
                    // Show live earning while working
                    RealTimeEarningCard(
                        checkInTime = uiState.inTime,
                        perMinuteRate = uiState.perMinuteRate
                    )
                }
            }
        }
        
        // Today's Status
        item {
            TodayStatusCard(uiState = uiState)
        }
        
        // Overtime Tracker Card
        item {
            OvertimeTrackerCard(uiState = uiState)
        }
        
        // Admin: Recent Records
        if (userRole == UserRole.ADMIN && uiState.recentRecords.isNotEmpty()) {
            item {
                Text(
                    text = "Recent Attendance",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            items(uiState.recentRecords.take(5)) { record ->
                AttendanceRecordItem(record = record)
            }
        }
    }
}

@Composable
fun AttendanceActionCard(
    uiState: AttendanceUiState,
    onCheckIn: () -> Unit,
    onCheckOut: () -> Unit
) {
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
                text = if (uiState.isCheckedIn && uiState.isCheckedOut) 
                    "✅ Attendance Complete" 
                else if (uiState.isCheckedIn) 
                    "Mark Your Check Out" 
                else 
                    "Mark Your Attendance",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(20.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Check In Button
                Button(
                    onClick = onCheckIn,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    enabled = !uiState.isCheckedIn && !uiState.isLoading,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Green,
                        disabledContainerColor = Color(0xFFD1D5DB)
                    )
                ) {
                    if (uiState.isLoading && !uiState.isCheckedIn) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = if (uiState.isCheckedIn) 
                                    Icons.Filled.CheckCircle 
                                else 
                                    Icons.Filled.Login,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (uiState.isCheckedIn) "Checked In" else "Check In",
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
                
                // Check Out Button
                Button(
                    onClick = onCheckOut,
                    modifier = Modifier
                        .weight(1f)
                        .height(56.dp),
                    enabled = uiState.isCheckedIn && !uiState.isCheckedOut && !uiState.isLoading,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Red,
                        disabledContainerColor = Color(0xFFD1D5DB)
                    )
                ) {
                    if (uiState.isLoading && uiState.isCheckedIn) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = if (uiState.isCheckedOut) 
                                    Icons.Filled.CheckCircle 
                                else 
                                    Icons.Filled.Logout,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (uiState.isCheckedOut) "Checked Out" else "Check Out",
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
            
            if (uiState.message.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = uiState.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (uiState.message.contains("✅")) Green else Red
                )
            }
        }
    }
}

@Composable
fun RealTimeEarningCard(
    checkInTime: String,
    perMinuteRate: Double
) {
    var currentEarning by remember { mutableStateOf(0.0) }
    var elapsedMinutes by remember { mutableStateOf(0) }
    var isEarningVisible by remember { mutableStateOf(true) }
    
    // Parse check-in time and calculate elapsed minutes
    fun parseTimeToMinutes(timeStr: String): Int {
        return try {
            val parts = timeStr.split(" ")
            val timeParts = parts[0].split(":")
            var hours = timeParts[0].toInt()
            val minutes = timeParts[1].toInt()
            val period = parts.getOrNull(1)?.uppercase() ?: "AM"
            
            if (period == "PM" && hours != 12) hours += 12
            if (period == "AM" && hours == 12) hours = 0
            
            hours * 60 + minutes
        } catch (e: Exception) {
            0
        }
    }
    
    fun getCurrentTimeMinutes(): Int {
        val cal = Calendar.getInstance()
        var hours = cal.get(Calendar.HOUR_OF_DAY)
        val minutes = cal.get(Calendar.MINUTE)
        return hours * 60 + minutes
    }
    
    LaunchedEffect(checkInTime) {
        while (true) {
            if (checkInTime.isNotEmpty()) {
                val checkInMinutes = parseTimeToMinutes(checkInTime)
                val currentMinutes = getCurrentTimeMinutes()
                
                elapsedMinutes = if (currentMinutes >= checkInMinutes) {
                    currentMinutes - checkInMinutes
                } else {
                    // Handle overnight (crossed midnight)
                    (24 * 60 - checkInMinutes) + currentMinutes
                }
                
                currentEarning = elapsedMinutes * perMinuteRate
            }
            kotlinx.coroutines.delay(60000) // Update every minute
        }
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "💰 Today's Earning (Live)",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color(0xFF059669)
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = { isEarningVisible = !isEarningVisible },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = if (isEarningVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                        contentDescription = if (isEarningVisible) "Hide earning" else "Show earning",
                        tint = Color(0xFF059669),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = if (isEarningVisible) "₹${String.format("%,.2f", currentEarning)}" else "₹ ••••••",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF059669)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "Working: ${elapsedMinutes / 60}h ${elapsedMinutes % 60}m (${elapsedMinutes}m)",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6B7280)
            )
            
            if (perMinuteRate > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Rate: ₹${String.format("%.2f", perMinuteRate)}/min",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF9CA3AF)
                )
            }
        }
    }
}

@Composable
fun TodayEarningCard(
    inTime: String,
    outTime: String,
    perMinuteRate: Double
) {
    var isEarningVisible by remember { mutableStateOf(true) }
    
    // Parse time and calculate total minutes worked
    fun parseTimeToMinutes(timeStr: String): Int {
        return try {
            val parts = timeStr.split(" ")
            val timeParts = parts[0].split(":")
            var hours = timeParts[0].toInt()
            val minutes = timeParts[1].toInt()
            val period = parts.getOrNull(1)?.uppercase() ?: "AM"
            
            if (period == "PM" && hours != 12) hours += 12
            if (period == "AM" && hours == 12) hours = 0
            
            hours * 60 + minutes
        } catch (e: Exception) {
            0
        }
    }
    
    val inMinutes = parseTimeToMinutes(inTime)
    val outMinutes = parseTimeToMinutes(outTime)
    
    val totalMinutes = if (outMinutes >= inMinutes) {
        outMinutes - inMinutes
    } else {
        // Handle overnight (crossed midnight)
        (24 * 60 - inMinutes) + outMinutes
    }
    
    val totalEarning = totalMinutes * perMinuteRate
    val hours = totalMinutes / 60
    val mins = totalMinutes % 60
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "💰 Today's Earning",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color(0xFF059669)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = Color(0xFF059669)
                ) {
                    Text(
                        text = "COMPLETE",
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = { isEarningVisible = !isEarningVisible },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = if (isEarningVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                        contentDescription = if (isEarningVisible) "Hide earning" else "Show earning",
                        tint = Color(0xFF059669),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = if (isEarningVisible) "₹${String.format("%,.2f", totalEarning)}" else "₹ ••••••",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF059669)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "Total Worked: ${hours}h ${mins}m (${totalMinutes}m)",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6B7280)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Time details
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Filled.Login,
                        contentDescription = null,
                        tint = Green,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = inTime,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6B7280)
                    )
                }
                
                Text(
                    text = "→",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF9CA3AF)
                )
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Filled.Logout,
                        contentDescription = null,
                        tint = Red,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = outTime,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6B7280)
                    )
                }
            }
            
            if (perMinuteRate > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (isEarningVisible) "Rate: ₹${String.format("%.2f", perMinuteRate)}/min" else "Rate: ₹ ••••/min",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF9CA3AF)
                )
            }
        }
    }
}

@Composable
fun TodayStatusCard(uiState: AttendanceUiState) {
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
                text = "📅 Today's Status",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                StatusItem(
                    label = "Date",
                    value = uiState.currentDate,
                    icon = Icons.Filled.CalendarToday
                )
                StatusItem(
                    label = "Check In",
                    value = uiState.inTime.ifEmpty { "--:--:--" },
                    icon = Icons.Filled.Login
                )
                StatusItem(
                    label = "Check Out",
                    value = uiState.outTime.ifEmpty { "--:--:--" },
                    icon = Icons.Filled.Logout
                )
            }
            
            if (uiState.inLocation.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider()
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.LocationOn,
                        contentDescription = null,
                        tint = Color(0xFF6B7280),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = uiState.inLocation,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF6B7280)
                    )
                }
            }
        }
    }
}

@Composable
fun OvertimeTrackerCard(uiState: AttendanceUiState) {
    val targetMinutes = uiState.monthlyTargetMinutes
    val workedMinutes = uiState.monthlyWorkedMinutes
    val deficit = uiState.deficitMinutes
    val overtimePerDay = uiState.overtimeRequired
    val daysRemaining = uiState.daysRemaining
    val daysWorked = uiState.daysWorked
    
    // Progress percentage
    val progress = if (targetMinutes > 0) (workedMinutes.toFloat() / targetMinutes.toFloat()).coerceIn(0f, 1f) else 0f
    
    // Determine card color based on status
    val cardColor = when {
        deficit <= 0 -> Color(0xFFECFDF5) // Green - on track
        deficit > 0 && daysRemaining > 0 -> Color(0xFFFEF3C7) // Yellow - behind but recoverable
        else -> Color(0xFFFEE2E2) // Red - critical
    }
    
    val statusColor = when {
        deficit <= 0 -> Color(0xFF059669)
        deficit > 0 && daysRemaining > 0 -> Color(0xFFD97706)
        else -> Color(0xFFDC2626)
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = cardColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "⏱️ Monthly Progress",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = statusColor
                ) {
                    Text(
                        text = if (deficit <= 0) "ON TRACK" else "BEHIND",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Progress Bar
            LinearProgressIndicator(
                progress = progress,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = statusColor,
                trackColor = Color.White
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "${workedMinutes}m / ${targetMinutes}m (${(progress * 100).toInt()}%)",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6B7280)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$daysWorked",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                    Text(
                        text = "Days Worked",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6B7280)
                    )
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$daysRemaining",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF6B7280)
                    )
                    Text(
                        text = "Days Left",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6B7280)
                    )
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${workedMinutes / 60}h ${workedMinutes % 60}m",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                    Text(
                        text = "Total Worked",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0xFF6B7280)
                    )
                }
            }
            
            // Deficit & Overtime Section
            if (deficit > 0) {
                Spacer(modifier = Modifier.height(16.dp))
                Divider(color = Color.White.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "📉 Deficit",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF6B7280)
                        )
                        Text(
                            text = "${deficit / 60}h ${deficit % 60}m (${deficit}m)",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                    
                    if (daysRemaining > 0) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "⚡ Overtime/Day",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color(0xFF6B7280)
                            )
                            Text(
                                text = "+${overtimePerDay}m extra",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = statusColor
                            )
                        }
                    }
                }
                
                if (daysRemaining > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "💡 Work ${600 + overtimePerDay}m/day to cover deficit",
                        style = MaterialTheme.typography.bodySmall,
                        color = statusColor,
                        fontWeight = FontWeight.Medium
                    )
                }
            } else if (workedMinutes > 0) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "✅ Great! You're on track this month",
                    style = MaterialTheme.typography.bodyMedium,
                    color = statusColor,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun StatusItem(
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
            tint = Color(0xFF6B7280),
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = Color(0xFF9CA3AF)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun AttendanceRecordItem(record: com.attendance.tracker.data.model.AttendanceRecord) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
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
                    text = record.employeeName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = record.date,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6B7280)
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${record.inTime} - ${record.outTime}",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = record.totalHours,
                    style = MaterialTheme.typography.bodySmall,
                    color = Green,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
