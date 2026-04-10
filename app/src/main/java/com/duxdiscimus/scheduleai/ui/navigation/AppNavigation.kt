package com.duxdiscimus.scheduleai.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.duxdiscimus.scheduleai.ui.screens.assistant.AssistantScreen
import com.duxdiscimus.scheduleai.ui.screens.event.EventScreen
import com.duxdiscimus.scheduleai.ui.screens.rules.RulesScreen
import com.duxdiscimus.scheduleai.ui.screens.schedule.ScheduleScreen
import com.duxdiscimus.scheduleai.ui.screens.settings.SettingsScreen

sealed class Screen(val route: String) {
    data object Schedule : Screen("schedule")
    data object Assistant : Screen("assistant")
    data object Rules : Screen("rules")
    data object Settings : Screen("settings")
    data object CreateEvent : Screen("event/create")
    data object EditEvent : Screen("event/{eventId}") {
        fun route(eventId: Long) = "event/$eventId"
    }
}

@Composable
fun AppNavigation(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Schedule.route,
        enterTransition = {
            fadeIn(tween(200)) + slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.Start, tween(200)
            )
        },
        exitTransition = {
            fadeOut(tween(200)) + slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.Start, tween(200)
            )
        },
        popEnterTransition = {
            fadeIn(tween(200)) + slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.End, tween(200)
            )
        },
        popExitTransition = {
            fadeOut(tween(200)) + slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.End, tween(200)
            )
        }
    ) {
        composable(Screen.Schedule.route) {
            ScheduleScreen(
                onNavigateToAddEvent = { navController.navigate(Screen.CreateEvent.route) },
                onNavigateToEvent = { id -> navController.navigate(Screen.EditEvent.route(id)) },
                onNavigateToAssistant = { navController.navigate(Screen.Assistant.route) }
            )
        }
        composable(Screen.Assistant.route) {
            AssistantScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Rules.route) {
            RulesScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.CreateEvent.route) {
            EventScreen(
                eventId = null,
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(
            route = Screen.EditEvent.route,
            arguments = listOf(navArgument("eventId") { type = NavType.LongType })
        ) { backStackEntry ->
            EventScreen(
                eventId = backStackEntry.arguments?.getLong("eventId"),
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
