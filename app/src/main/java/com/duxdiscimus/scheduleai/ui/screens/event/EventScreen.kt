package com.duxdiscimus.scheduleai.ui.screens.event

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.domain.model.Recurrence
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventScreen(
    eventId: Long?,
    onNavigateBack: () -> Unit,
    viewModel: EventViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val categories by viewModel.categories.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showDatePicker by remember { mutableStateOf<DatePickerTarget?>(null) }
    var showTimePicker by remember { mutableStateOf<TimePickerTarget?>(null) }

    val dateFormatter = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy")
    val timeFormatter = DateTimeFormatter.ofPattern("h:mm a")

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (uiState.isNew) "New Event" else "Edit Event",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
                actions = {
                    if (!uiState.isNew) {
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                Icons.Default.DeleteOutline,
                                contentDescription = "Delete",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    TextButton(
                        onClick = {
                            viewModel.saveEvent(
                                onSuccess = onNavigateBack,
                                onError = { errorMessage = it }
                            )
                        }
                    ) {
                        Text("Save", fontWeight = FontWeight.Bold)
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(Modifier.height(4.dp))

            // Title
            OutlinedTextField(
                value = uiState.title,
                onValueChange = viewModel::updateTitle,
                label = { Text("Event Title *") },
                modifier = Modifier.fillMaxWidth(),
                isError = uiState.titleError != null,
                supportingText = uiState.titleError?.let { { Text(it) } },
                leadingIcon = { Icon(Icons.Outlined.Title, null) },
                singleLine = true
            )

            // All day toggle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Outlined.WbSunny, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(12.dp))
                Text("All Day", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Switch(checked = uiState.isAllDay, onCheckedChange = viewModel::updateIsAllDay)
            }

            // Date/Time section
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Start date/time
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Start Date", style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            OutlinedButton(
                                onClick = { showDatePicker = DatePickerTarget.START },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Outlined.CalendarMonth, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(uiState.startTime.format(dateFormatter),
                                    style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        if (!uiState.isAllDay) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Start Time", style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(4.dp))
                                OutlinedButton(
                                    onClick = { showTimePicker = TimePickerTarget.START },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Outlined.Schedule, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(uiState.startTime.format(timeFormatter),
                                        style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }

                    Divider()

                    // End date/time
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("End Date", style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            OutlinedButton(
                                onClick = { showDatePicker = DatePickerTarget.END },
                                modifier = Modifier.fillMaxWidth(),
                                colors = if (uiState.endTimeError != null)
                                    ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                                else ButtonDefaults.outlinedButtonColors()
                            ) {
                                Icon(Icons.Outlined.CalendarMonth, null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(uiState.endTime.format(dateFormatter),
                                    style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        if (!uiState.isAllDay) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("End Time", style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(4.dp))
                                OutlinedButton(
                                    onClick = { showTimePicker = TimePickerTarget.END },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Outlined.Schedule, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(uiState.endTime.format(timeFormatter),
                                        style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                    uiState.endTimeError?.let {
                        Text(it, style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error)
                    }
                }
            }

            // Category
            if (categories.isNotEmpty()) {
                Text("Category", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    categories.forEach { cat ->
                        FilterChip(
                            selected = uiState.categoryId == cat.id,
                            onClick = { viewModel.updateCategory(cat.id) },
                            label = { Text(cat.name, style = MaterialTheme.typography.labelSmall) },
                            leadingIcon = if (uiState.categoryId == cat.id) {
                                { Icon(Icons.Default.Check, null, modifier = Modifier.size(14.dp)) }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(cat.color).copy(alpha = 0.2f),
                                selectedLabelColor = Color(cat.color)
                            )
                        )
                    }
                }
            }

            // Priority
            Text("Priority", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Priority.entries.forEach { priority ->
                    val color = when (priority) {
                        Priority.LOW -> Color(0xFF66BB6A)
                        Priority.MEDIUM -> Color(0xFFFFA726)
                        Priority.HIGH -> Color(0xFFEF5350)
                        Priority.URGENT -> Color(0xFFB71C1C)
                    }
                    FilterChip(
                        selected = uiState.priority == priority,
                        onClick = { viewModel.updatePriority(priority) },
                        label = { Text(priority.label, style = MaterialTheme.typography.labelSmall) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = color.copy(alpha = 0.2f),
                            selectedLabelColor = color
                        )
                    )
                }
            }

            // Location
            OutlinedTextField(
                value = uiState.location,
                onValueChange = viewModel::updateLocation,
                label = { Text("Location") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.LocationOn, null) },
                singleLine = true
            )

            // Description
            OutlinedTextField(
                value = uiState.description,
                onValueChange = viewModel::updateDescription,
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.Notes, null) },
                maxLines = 3,
                minLines = 2
            )

            // Reminder
            Text("Reminder", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            val reminderOptions = listOf(0 to "None", 5 to "5 min", 10 to "10 min", 15 to "15 min",
                30 to "30 min", 60 to "1 hour", 120 to "2 hours", 1440 to "1 day")
            var reminderExpanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = reminderExpanded,
                onExpandedChange = { reminderExpanded = it }
            ) {
                OutlinedTextField(
                    value = reminderOptions.find { it.first == uiState.reminderMinutes }?.second
                        ?: "${uiState.reminderMinutes} min",
                    onValueChange = {},
                    readOnly = true,
                    leadingIcon = { Icon(Icons.Outlined.Notifications, null) },
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
                                viewModel.updateReminderMinutes(minutes)
                                reminderExpanded = false
                            }
                        )
                    }
                }
            }

            // Recurrence
            Text("Recurrence", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            var recurrenceExpanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = recurrenceExpanded,
                onExpandedChange = { recurrenceExpanded = it }
            ) {
                OutlinedTextField(
                    value = uiState.recurrence.label,
                    onValueChange = {},
                    readOnly = true,
                    leadingIcon = { Icon(Icons.Outlined.Repeat, null) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(recurrenceExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = recurrenceExpanded,
                    onDismissRequest = { recurrenceExpanded = false }
                ) {
                    Recurrence.entries.forEach { rec ->
                        DropdownMenuItem(
                            text = { Text(rec.label) },
                            onClick = {
                                viewModel.updateRecurrence(rec)
                                recurrenceExpanded = false
                            }
                        )
                    }
                }
            }

            // Notes
            OutlinedTextField(
                value = uiState.notes,
                onValueChange = viewModel::updateNotes,
                label = { Text("Notes") },
                modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.StickyNote2, null) },
                maxLines = 4,
                minLines = 2
            )

            Spacer(Modifier.height(16.dp))
        }
    }

    // Delete confirmation
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Event") },
            text = { Text("Are you sure you want to delete \"${uiState.title}\"?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteEvent(onNavigateBack)
                        showDeleteDialog = false
                    }
                ) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Date picker dialogs
    showDatePicker?.let { target ->
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = when (target) {
                DatePickerTarget.START -> uiState.startTime.toLocalDate()
                    .toEpochDay() * 86400000L
                DatePickerTarget.END -> uiState.endTime.toLocalDate()
                    .toEpochDay() * 86400000L
            }
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = null },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val epochDay = millis / 86400000L
                        val date = LocalDate.ofEpochDay(epochDay)
                        when (target) {
                            DatePickerTarget.START -> viewModel.updateStartTime(
                                LocalDateTime.of(date, uiState.startTime.toLocalTime())
                            )
                            DatePickerTarget.END -> viewModel.updateEndTime(
                                LocalDateTime.of(date, uiState.endTime.toLocalTime())
                            )
                        }
                    }
                    showDatePicker = null
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = null }) { Text("Cancel") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // Time picker dialogs
    showTimePicker?.let { target ->
        val currentTime = when (target) {
            TimePickerTarget.START -> uiState.startTime.toLocalTime()
            TimePickerTarget.END -> uiState.endTime.toLocalTime()
        }
        val timePickerState = rememberTimePickerState(
            initialHour = currentTime.hour,
            initialMinute = currentTime.minute
        )
        AlertDialog(
            onDismissRequest = { showTimePicker = null },
            confirmButton = {
                TextButton(onClick = {
                    val time = LocalTime.of(timePickerState.hour, timePickerState.minute)
                    when (target) {
                        TimePickerTarget.START -> viewModel.updateStartTime(
                            LocalDateTime.of(uiState.startTime.toLocalDate(), time)
                        )
                        TimePickerTarget.END -> viewModel.updateEndTime(
                            LocalDateTime.of(uiState.endTime.toLocalDate(), time)
                        )
                    }
                    showTimePicker = null
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = null }) { Text("Cancel") }
            },
            text = { TimePicker(state = timePickerState) }
        )
    }

    // Error snackbar
    errorMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { errorMessage = null },
            title = { Text("Error") },
            text = { Text(msg) },
            confirmButton = {
                TextButton(onClick = { errorMessage = null }) { Text("OK") }
            }
        )
    }
}

enum class DatePickerTarget { START, END }
enum class TimePickerTarget { START, END }
