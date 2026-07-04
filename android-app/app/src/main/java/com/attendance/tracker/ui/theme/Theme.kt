package com.attendance.tracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Light Theme Colors
val Primary = Color(0xFF2563EB)
val PrimaryVariant = Color(0xFF1D4ED8)
val Secondary = Color(0xFF7C3AED)
val Background = Color(0xFFF9FAFB)
val Surface = Color(0xFFFFFFFF)
val Error = Color(0xFFDC2626)
val OnPrimary = Color(0xFFFFFFFF)
val OnSecondary = Color(0xFFFFFFFF)
val OnBackground = Color(0xFF111827)
val OnSurface = Color(0xFF111827)
val OnError = Color(0xFFFFFFFF)

val Green = Color(0xFF16A34A)
val Yellow = Color(0xFFCA8A04)
val Red = Color(0xFFDC2626)
val Gray = Color(0xFF6B7280)
val LightGray = Color(0xFFF3F4F6)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    secondary = Secondary,
    onSecondary = OnSecondary,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnSurface,
    error = Error,
    onError = OnError
)

@Composable
fun AttendanceTrackerTheme(
    content: @Composable () -> Unit
) {
    // Always use light theme as requested
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
