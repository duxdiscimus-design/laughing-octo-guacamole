package com.duxdiscimus.scheduleai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Rule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Rule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.duxdiscimus.scheduleai.ui.navigation.AppNavigation
import com.duxdiscimus.scheduleai.ui.navigation.Screen
import com.duxdiscimus.scheduleai.ui.theme.ScheduleAiTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ScheduleAiTheme {
                ScheduleAiApp()
            }
        }
    }
}

data class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

@Composable
fun ScheduleAiApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val bottomNavItems = listOf(
        BottomNavItem(
            route = Screen.Schedule.route,
            title = "Schedule",
            selectedIcon = Icons.Filled.CalendarMonth,
            unselectedIcon = Icons.Outlined.CalendarMonth
        ),
        BottomNavItem(
            route = Screen.Assistant.route,
            title = "AI",
            selectedIcon = Icons.Filled.AutoAwesome,
            unselectedIcon = Icons.Outlined.AutoAwesome
        ),
        BottomNavItem(
            route = Screen.Rules.route,
            title = "Rules",
            selectedIcon = Icons.Filled.Rule,
            unselectedIcon = Icons.Outlined.Rule
        ),
        BottomNavItem(
            route = Screen.Settings.route,
            title = "Settings",
            selectedIcon = Icons.Filled.Settings,
            unselectedIcon = Icons.Outlined.Settings
        )
    )

    // Show bottom nav only on top-level screens
    val showBottomBar = currentRoute in listOf(
        Screen.Schedule.route,
        Screen.Assistant.route,
        Screen.Rules.route,
        Screen.Settings.route
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val isSelected = currentRoute == item.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                if (!isSelected) {
                                    navController.navigate(item.route) {
                                        popUpTo(Screen.Schedule.route) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.title
                                )
                            },
                            label = { Text(item.title) }
                        )
                    }
                }
            }
        }
    ) { _ ->
        AppNavigation(navController = navController)
    }
}
