package com.duxdiscimus.scheduleai.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.duxdiscimus.scheduleai.ai.LlmState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val settings by viewModel.settings.collectAsState()
    val llmState by viewModel.llmState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Spacer(Modifier.height(8.dp))

            // AI Model Section
            SettingsSectionHeader("AI Assistant")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            null,
                            tint = when (llmState) {
                                is LlmState.Ready -> MaterialTheme.colorScheme.primary
                                is LlmState.Error, LlmState.ModelNotFound ->
                                    MaterialTheme.colorScheme.error
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            }
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Gemma AI Model", style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold)
                            Text(
                                text = when (val s = llmState) {
                                    is LlmState.Ready -> "Ready: ${s.modelName}"
                                    is LlmState.Loading -> "Loading…"
                                    is LlmState.ModelNotFound -> "Model not found"
                                    is LlmState.Error -> "Error: ${s.message}"
                                    else -> "Not initialized"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (llmState !is LlmState.Ready) {
                            IconButton(onClick = viewModel::retryModelLoad) {
                                Icon(Icons.Default.Refresh, "Retry")
                            }
                        }
                    }
                    if (llmState is LlmState.ModelNotFound || llmState is LlmState.Uninitialized) {
                        Spacer(Modifier.height(8.dp))
                        val modelsDir = viewModel.getModelsDirectory()
                        Text(
                            "Place Gemma model file in:\n${modelsDir.absolutePath}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Recommended models:\n" +
                            "• gemma3-4b-it-int4.bin (Best, ~2.5GB)\n" +
                            "• gemma3-1b-it-int4.bin (Fast, ~0.9GB)\n" +
                            "Download: kaggle.com/models/google/gemma",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }

            // Appearance Section
            SettingsSectionHeader("Appearance")
            SettingsToggleItem(
                icon = Icons.Outlined.DarkMode,
                title = "Dark Theme",
                subtitle = "Use dark color scheme",
                checked = settings.darkTheme,
                onCheckedChange = viewModel::updateDarkTheme
            )
            SettingsToggleItem(
                icon = Icons.Outlined.Palette,
                title = "Dynamic Color",
                subtitle = "Use Material You colors from wallpaper",
                checked = settings.useDynamicColor,
                onCheckedChange = viewModel::updateDynamicColor
            )

            // Notifications Section
            SettingsSectionHeader("Notifications")
            SettingsToggleItem(
                icon = Icons.Outlined.Notifications,
                title = "Event Reminders",
                subtitle = "Get notified before events",
                checked = settings.notificationsEnabled,
                onCheckedChange = viewModel::updateNotifications
            )

            // Schedule Section
            SettingsSectionHeader("Schedule Preferences")
            // Default reminder
            var reminderExpanded by remember { mutableStateOf(false) }
            val reminderOptions = listOf(0 to "None", 5 to "5 min", 10 to "10 min",
                15 to "15 min", 30 to "30 min", 60 to "1 hour", 1440 to "1 day")
            ExposedDropdownMenuBox(
                expanded = reminderExpanded,
                onExpandedChange = { reminderExpanded = it }
            ) {
                OutlinedTextField(
                    value = "Default Reminder: ${reminderOptions.find { it.first == settings.defaultReminderMinutes }?.second ?: "${settings.defaultReminderMinutes} min"}",
                    onValueChange = {},
                    readOnly = true,
                    leadingIcon = { Icon(Icons.Outlined.Alarm, null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(reminderExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = reminderExpanded,
                    onDismissRequest = { reminderExpanded = false }
                ) {
                    reminderOptions.forEach { (minutes, label) ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                viewModel.updateDefaultReminder(minutes)
                                reminderExpanded = false
                            }
                        )
                    }
                }
            }

            // Work hours
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                var workStart by remember(settings.workHoursStart) {
                    mutableStateOf(settings.workHoursStart)
                }
                var workEnd by remember(settings.workHoursEnd) {
                    mutableStateOf(settings.workHoursEnd)
                }
                OutlinedTextField(
                    value = workStart,
                    onValueChange = {
                        workStart = it
                        viewModel.updateWorkHours(it, workEnd)
                    },
                    label = { Text("Work Start") },
                    modifier = Modifier.weight(1f),
                    leadingIcon = { Icon(Icons.Outlined.WbSunny, null) },
                    singleLine = true
                )
                OutlinedTextField(
                    value = workEnd,
                    onValueChange = {
                        workEnd = it
                        viewModel.updateWorkHours(workStart, it)
                    },
                    label = { Text("Work End") },
                    modifier = Modifier.weight(1f),
                    leadingIcon = { Icon(Icons.Outlined.NightlightRound, null) },
                    singleLine = true
                )
            }

            // About Section
            SettingsSectionHeader("About")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Info, null,
                            tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("ScheduleAI v1.0", style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold)
                            Text(
                                "Powered by Gemma 3 (MediaPipe LLM Inference)\nFor Google Pixel 10 Pro",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
fun SettingsSectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
    )
}

@Composable
fun SettingsToggleItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                Text(subtitle, style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
