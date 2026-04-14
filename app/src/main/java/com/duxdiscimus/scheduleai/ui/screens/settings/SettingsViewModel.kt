package com.duxdiscimus.scheduleai.ui.screens.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.duxdiscimus.scheduleai.ai.LlmInferenceManager
import com.duxdiscimus.scheduleai.ai.LlmState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val llmManager: LlmInferenceManager
) : ViewModel() {

    val llmState: StateFlow<LlmState> = llmManager.state
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LlmState.Uninitialized)

    val settings: StateFlow<AppSettings> = dataStore.data.map { prefs ->
        AppSettings(
            darkTheme = prefs[Keys.DARK_THEME] ?: false,
            useDynamicColor = prefs[Keys.DYNAMIC_COLOR] ?: true,
            notificationsEnabled = prefs[Keys.NOTIFICATIONS] ?: true,
            workHoursStart = prefs[Keys.WORK_HOURS_START] ?: "09:00",
            workHoursEnd = prefs[Keys.WORK_HOURS_END] ?: "18:00",
            firstDayOfWeek = prefs[Keys.FIRST_DAY] ?: 1,
            modelPath = prefs[Keys.MODEL_PATH] ?: "",
            defaultReminderMinutes = prefs[Keys.DEFAULT_REMINDER] ?: 15
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppSettings())

    fun updateDarkTheme(dark: Boolean) = updatePref { prefs ->
        prefs[Keys.DARK_THEME] = dark
    }

    fun updateDynamicColor(dynamic: Boolean) = updatePref { prefs ->
        prefs[Keys.DYNAMIC_COLOR] = dynamic
    }

    fun updateNotifications(enabled: Boolean) = updatePref { prefs ->
        prefs[Keys.NOTIFICATIONS] = enabled
    }

    fun updateWorkHours(start: String, end: String) = updatePref { prefs ->
        prefs[Keys.WORK_HOURS_START] = start
        prefs[Keys.WORK_HOURS_END] = end
    }

    fun updateFirstDayOfWeek(day: Int) = updatePref { prefs ->
        prefs[Keys.FIRST_DAY] = day
    }

    fun updateModelPath(path: String) = updatePref { prefs ->
        prefs[Keys.MODEL_PATH] = path
    }

    fun updateDefaultReminder(minutes: Int) = updatePref { prefs ->
        prefs[Keys.DEFAULT_REMINDER] = minutes
    }

    fun retryModelLoad() {
        viewModelScope.launch {
            llmManager.initialize()
        }
    }

    fun getModelsDirectory() = llmManager.getModelsDirectory()

    private fun updatePref(block: suspend (MutablePreferences) -> Unit) {
        viewModelScope.launch {
            dataStore.edit { prefs -> block(prefs) }
        }
    }

    object Keys {
        val DARK_THEME = booleanPreferencesKey("dark_theme")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
        val NOTIFICATIONS = booleanPreferencesKey("notifications")
        val WORK_HOURS_START = stringPreferencesKey("work_hours_start")
        val WORK_HOURS_END = stringPreferencesKey("work_hours_end")
        val FIRST_DAY = intPreferencesKey("first_day_of_week")
        val MODEL_PATH = stringPreferencesKey("model_path")
        val DEFAULT_REMINDER = intPreferencesKey("default_reminder")
    }
}

data class AppSettings(
    val darkTheme: Boolean = false,
    val useDynamicColor: Boolean = true,
    val notificationsEnabled: Boolean = true,
    val workHoursStart: String = "09:00",
    val workHoursEnd: String = "18:00",
    val firstDayOfWeek: Int = 1, // 1=Monday, 7=Sunday
    val modelPath: String = "",
    val defaultReminderMinutes: Int = 15
)
