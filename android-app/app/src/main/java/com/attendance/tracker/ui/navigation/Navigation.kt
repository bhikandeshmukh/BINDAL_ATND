package com.attendance.tracker.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Attendance : Screen(
        route = "attendance",
        title = "Attendance",
        selectedIcon = Icons.Filled.CheckCircle,
        unselectedIcon = Icons.Outlined.CheckCircle
    )
    
    object NightDuty : Screen(
        route = "night_duty",
        title = "Night Duty",
        selectedIcon = Icons.Filled.NightsStay,
        unselectedIcon = Icons.Outlined.NightsStay
    )
    
    object Leaves : Screen(
        route = "leaves",
        title = "Leaves",
        selectedIcon = Icons.Filled.BeachAccess,
        unselectedIcon = Icons.Outlined.BeachAccess
    )
    
    object Reports : Screen(
        route = "reports",
        title = "Reports",
        selectedIcon = Icons.Filled.Assessment,
        unselectedIcon = Icons.Outlined.Assessment
    )
    
    object Notifications : Screen(
        route = "notifications",
        title = "Alerts",
        selectedIcon = Icons.Filled.Notifications,
        unselectedIcon = Icons.Outlined.Notifications
    )
    
    object Employees : Screen(
        route = "employees",
        title = "Employees",
        selectedIcon = Icons.Filled.People,
        unselectedIcon = Icons.Outlined.People
    )
    
    object Login : Screen(
        route = "login",
        title = "Login",
        selectedIcon = Icons.Filled.Login,
        unselectedIcon = Icons.Outlined.Login
    )
}

val userBottomNavItems = listOf(
    Screen.Attendance,
    Screen.NightDuty,
    Screen.Leaves,
    Screen.Reports,
    Screen.Notifications
)

val adminBottomNavItems = listOf(
    Screen.Attendance,
    Screen.NightDuty,
    Screen.Leaves,
    Screen.Employees,
    Screen.Notifications
)
