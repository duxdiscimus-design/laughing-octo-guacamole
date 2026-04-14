package com.duxdiscimus.scheduleai.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = ScheduleBlueLight,
    onPrimary = SurfaceDark,
    primaryContainer = ScheduleBlueDark,
    onPrimaryContainer = ScheduleBlueLight,
    secondary = ScheduleTeal,
    onSecondary = SurfaceDark,
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFF004D40),
    onSecondaryContainer = ScheduleTeal,
    tertiary = SchedulePurple,
    background = SurfaceDark,
    surface = SurfaceDark,
    surfaceVariant = CardDark,
    onBackground = androidx.compose.ui.graphics.Color(0xFFE8EAF6),
    onSurface = androidx.compose.ui.graphics.Color(0xFFE8EAF6),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFB0BEC5)
)

private val LightColorScheme = lightColorScheme(
    primary = ScheduleBlue,
    onPrimary = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    primaryContainer = ScheduleBlueLight,
    onPrimaryContainer = ScheduleBlueDark,
    secondary = ScheduleTeal,
    onSecondary = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFFB2DFDB),
    onSecondaryContainer = androidx.compose.ui.graphics.Color(0xFF004D40),
    tertiary = SchedulePurple,
    background = SurfaceLight,
    surface = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFFF0F4FF),
    onBackground = androidx.compose.ui.graphics.Color(0xFF1A1C2E),
    onSurface = androidx.compose.ui.graphics.Color(0xFF1A1C2E),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFF455A64)
)

@Composable
fun ScheduleAiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
