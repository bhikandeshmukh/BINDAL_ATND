package com.attendance.tracker

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.attendance.tracker.ads.AdMobManager
import com.attendance.tracker.ads.BannerAdView
import com.attendance.tracker.data.model.UserRole
import com.attendance.tracker.ui.navigation.*
import com.attendance.tracker.ui.screens.attendance.AttendanceScreen
import com.attendance.tracker.ui.screens.employees.EmployeeScreen
import com.attendance.tracker.ui.screens.leaves.LeaveScreen
import com.attendance.tracker.ui.screens.login.LoginScreen
import com.attendance.tracker.ui.screens.nightduty.NightDutyScreen
import com.attendance.tracker.ui.screens.notifications.NotificationScreen
import com.attendance.tracker.ui.screens.reports.ReportScreen
import com.attendance.tracker.ui.theme.AttendanceTrackerTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var adMobManager: AdMobManager
    
    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        when {
            permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) -> {
                // Fine location granted
            }
            permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false) -> {
                // Coarse location granted
            }
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize AdMob
        adMobManager.initialize()
        
        // Request location permissions
        locationPermissionRequest.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ))
        
        setContent {
            AttendanceTrackerTheme {
                AttendanceApp(
                    adMobManager = adMobManager, 
                    activity = this
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceApp(
    mainViewModel: MainViewModel = hiltViewModel(),
    adMobManager: AdMobManager? = null,
    activity: ComponentActivity? = null
) {
    val navController = rememberNavController()
    val currentUser by mainViewModel.currentUser.collectAsState()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    
    val isLoggedIn = currentUser != null
    val isAdmin = currentUser?.role == UserRole.ADMIN
    
    val bottomNavItems = if (isAdmin) adminBottomNavItems else userBottomNavItems
    
    // Track screen changes for interstitial ads
    var screenChangeCount by remember { mutableStateOf(0) }
    
    LaunchedEffect(currentDestination?.route) {
        screenChangeCount++
        // Show interstitial ad every 5 screen changes
        if (screenChangeCount % 5 == 0 && activity != null && adMobManager != null) {
            adMobManager.showInterstitialAd(activity)
        }
    }
    
    Scaffold(
        topBar = {
            if (isLoggedIn && currentDestination?.route != Screen.Login.route) {
                TopAppBar(
                    title = {
                        Text(
                            text = "Attendance Tracker",
                            fontWeight = FontWeight.Bold
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color(0xFF2563EB),
                        titleContentColor = Color.White,
                        actionIconContentColor = Color.White
                    ),
                    actions = {
                        // Notification Badge
                        IconButton(onClick = {
                            navController.navigate(Screen.Notifications.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }) {
                            Icon(
                                Icons.Filled.Notifications,
                                contentDescription = "Notifications"
                            )
                        }
                        
                        // Logout
                        IconButton(onClick = { mainViewModel.logout() }) {
                            Icon(
                                Icons.Filled.Logout,
                                contentDescription = "Logout"
                            )
                        }
                    }
                )
            }
        },
        bottomBar = {
            if (isLoggedIn && currentDestination?.route != Screen.Login.route) {
                Column {
                    // Banner Ad above bottom navigation
                    BannerAdView(
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    NavigationBar(
                        containerColor = Color.White,
                        tonalElevation = 8.dp
                    ) {
                        bottomNavItems.forEach { screen ->
                            val selected = currentDestination?.hierarchy?.any { 
                                it.route == screen.route 
                            } == true
                            
                            NavigationBarItem(
                                icon = {
                                    Icon(
                                        imageVector = if (selected) screen.selectedIcon else screen.unselectedIcon,
                                        contentDescription = screen.title
                                    )
                                },
                                label = { 
                                    Text(
                                        text = screen.title,
                                        style = MaterialTheme.typography.labelSmall
                                    ) 
                                },
                                selected = selected,
                                onClick = {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor = Color(0xFF2563EB),
                                    selectedTextColor = Color(0xFF2563EB),
                                    indicatorColor = Color(0xFFEFF6FF),
                                    unselectedIconColor = Color(0xFF6B7280),
                                    unselectedTextColor = Color(0xFF6B7280)
                                )
                            )
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = if (isLoggedIn) Screen.Attendance.route else Screen.Login.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Attendance.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }
            
            composable(Screen.Attendance.route) {
                currentUser?.let { user ->
                    AttendanceScreen(
                        userName = user.name,
                        userRole = user.role
                    )
                }
            }
            
            composable(Screen.NightDuty.route) {
                currentUser?.let { user ->
                    NightDutyScreen(
                        userName = user.name,
                        userRole = user.role
                    )
                }
            }
            
            composable(Screen.Leaves.route) {
                currentUser?.let { user ->
                    LeaveScreen(
                        userName = user.name,
                        userRole = user.role
                    )
                }
            }
            
            composable(Screen.Reports.route) {
                currentUser?.let { user ->
                    ReportScreen(
                        userName = user.name,
                        userRole = user.role
                    )
                }
            }
            
            composable(Screen.Notifications.route) {
                currentUser?.let { user ->
                    NotificationScreen(userId = user.id)
                }
            }
            
            composable(Screen.Employees.route) {
                EmployeeScreen()
            }
        }
    }
    
    // Handle logout navigation
    LaunchedEffect(isLoggedIn) {
        if (!isLoggedIn) {
            navController.navigate(Screen.Login.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }
}
