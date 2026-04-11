package com.duxdiscimus.scheduleai.ui.screens.schedule

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.ui.theme.PriorityHigh
import com.duxdiscimus.scheduleai.ui.theme.PriorityLow
import com.duxdiscimus.scheduleai.ui.theme.PriorityMedium
import com.duxdiscimus.scheduleai.ui.theme.PriorityUrgent
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    onNavigateToAddEvent: () -> Unit,
    onNavigateToEvent: (Long) -> Unit,
    onNavigateToAssistant: () -> Unit,
    viewModel: ScheduleViewModel = hiltViewModel()
) {
    val selectedDate by viewModel.selectedDate.collectAsState()
    val viewMode by viewModel.viewMode.collectAsState()
    val allEvents by viewModel.allEvents.collectAsState()
    val eventsForDay by viewModel.eventsForSelectedDate.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val isSearchActive by viewModel.isSearchActive.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()
    var showDeleteConfirm by remember { mutableStateOf<Event?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (isSearchActive) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = viewModel::setSearchQuery,
                            placeholder = { Text("Search events...") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            )
                        )
                    } else {
                        Text(
                            text = "ScheduleAI",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.setSearchActive(!isSearchActive) }) {
                        Icon(
                            if (isSearchActive) Icons.Default.Close else Icons.Default.Search,
                            contentDescription = "Search"
                        )
                    }
                    IconButton(onClick = onNavigateToAssistant) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "AI Assistant",
                            tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = viewModel::navigateToToday) {
                        Icon(Icons.Default.Today, contentDescription = "Today")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToAddEvent,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Event",
                    tint = MaterialTheme.colorScheme.onPrimary)
            }
        }
    ) { padding ->
        if (isSearchActive && searchQuery.isNotBlank()) {
            SearchResultsList(
                results = searchResults,
                onEventClick = onNavigateToEvent,
                modifier = Modifier.padding(padding)
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // View mode selector
                ViewModeSelector(
                    selectedMode = viewMode,
                    onModeSelected = viewModel::setViewMode,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )

                when (viewMode) {
                    CalendarViewMode.WEEK -> WeekView(
                        selectedDate = selectedDate,
                        events = allEvents,
                        onDateSelected = viewModel::selectDate,
                        onNavigatePrev = viewModel::navigateToPreviousPeriod,
                        onNavigateNext = viewModel::navigateToNextPeriod,
                        eventsForDay = eventsForDay,
                        onEventClick = onNavigateToEvent,
                        onEventLongClick = { showDeleteConfirm = it }
                    )
                    CalendarViewMode.MONTH -> MonthView(
                        selectedDate = selectedDate,
                        events = allEvents,
                        onDateSelected = viewModel::selectDate,
                        onNavigatePrev = viewModel::navigateToPreviousPeriod,
                        onNavigateNext = viewModel::navigateToNextPeriod,
                        eventsForDay = eventsForDay,
                        onEventClick = onNavigateToEvent
                    )
                    CalendarViewMode.AGENDA -> AgendaView(
                        selectedDate = selectedDate,
                        events = allEvents.filter { it.startTime >= LocalDateTime.now() }
                            .sortedBy { it.startTime },
                        onEventClick = onNavigateToEvent,
                        onEventLongClick = { showDeleteConfirm = it }
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    showDeleteConfirm?.let { event ->
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Delete Event") },
            text = { Text("Delete \"${event.title}\"?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteEvent(event)
                    showDeleteConfirm = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun ViewModeSelector(
    selectedMode: CalendarViewMode,
    onModeSelected: (CalendarViewMode) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        CalendarViewMode.entries.forEach { mode ->
            FilterChip(
                selected = selectedMode == mode,
                onClick = { onModeSelected(mode) },
                label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) }
            )
        }
    }
}

@Composable
fun WeekView(
    selectedDate: LocalDate,
    events: List<Event>,
    onDateSelected: (LocalDate) -> Unit,
    onNavigatePrev: () -> Unit,
    onNavigateNext: () -> Unit,
    eventsForDay: List<Event>,
    onEventClick: (Long) -> Unit,
    onEventLongClick: (Event) -> Unit
) {
    val weekStart = selectedDate.with(DayOfWeek.MONDAY)
    val weekDays = (0..6).map { weekStart.plusDays(it.toLong()) }
    val today = LocalDate.now()
    val formatter = DateTimeFormatter.ofPattern("MMM d")

    Column {
        // Week header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onNavigatePrev) {
                Icon(Icons.Default.ChevronLeft, "Previous week")
            }
            Text(
                text = "${weekStart.format(formatter)} - ${weekStart.plusDays(6).format(formatter)}, ${weekStart.year}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            IconButton(onClick = onNavigateNext) {
                Icon(Icons.Default.ChevronRight, "Next week")
            }
        }

        // Day headers
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            weekDays.forEach { day ->
                DayChip(
                    day = day,
                    isSelected = day == selectedDate,
                    isToday = day == today,
                    eventCount = events.count { it.startTime.toLocalDate() == day },
                    onClick = { onDateSelected(day) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        // Events for selected day
        if (eventsForDay.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Outlined.EventNote,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "No events on ${selectedDate.format(DateTimeFormatter.ofPattern("EEEE, MMM d"))}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(eventsForDay, key = { it.id }) { event ->
                    EventListItem(
                        event = event,
                        onClick = { onEventClick(event.id) },
                        onLongClick = { onEventLongClick(event) }
                    )
                }
            }
        }
    }
}

@Composable
fun DayChip(
    day: LocalDate,
    isSelected: Boolean,
    isToday: Boolean,
    eventCount: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .background(
                when {
                    isSelected -> MaterialTheme.colorScheme.primary
                    isToday -> MaterialTheme.colorScheme.primaryContainer
                    else -> Color.Transparent
                }
            )
            .padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = day.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
            style = MaterialTheme.typography.labelSmall,
            color = when {
                isSelected -> MaterialTheme.colorScheme.onPrimary
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
        )
        Text(
            text = day.dayOfMonth.toString(),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
            color = when {
                isSelected -> MaterialTheme.colorScheme.onPrimary
                isToday -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.onSurface
            }
        )
        if (eventCount > 0) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.onPrimary
                        else MaterialTheme.colorScheme.primary
                    )
            )
        } else {
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
fun MonthView(
    selectedDate: LocalDate,
    events: List<Event>,
    onDateSelected: (LocalDate) -> Unit,
    onNavigatePrev: () -> Unit,
    onNavigateNext: () -> Unit,
    eventsForDay: List<Event>,
    onEventClick: (Long) -> Unit
) {
    val yearMonth = YearMonth.from(selectedDate)
    val firstDayOfMonth = yearMonth.atDay(1)
    val daysInMonth = yearMonth.lengthOfMonth()
    val firstDayOfWeek = firstDayOfMonth.dayOfWeek.value % 7
    val today = LocalDate.now()

    Column {
        // Month header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onNavigatePrev) {
                Icon(Icons.Default.ChevronLeft, "Previous month")
            }
            Text(
                text = firstDayOfMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onNavigateNext) {
                Icon(Icons.Default.ChevronRight, "Next month")
            }
        }

        // Day of week headers
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
            listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa").forEach { d ->
                Text(
                    text = d,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }

        // Calendar grid
        val calendarDays = buildList {
            repeat(firstDayOfMonth.dayOfWeek.value % 7) { add(null) }
            (1..daysInMonth).forEach { add(yearMonth.atDay(it)) }
        }

        val weeks = calendarDays.chunked(7) { week ->
            week + List(7 - week.size) { null }
        }

        weeks.forEach { week ->
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                week.forEach { day ->
                    Box(
                        modifier = Modifier.weight(1f).padding(2.dp),
                        contentAlignment = Alignment.TopCenter
                    ) {
                        if (day != null) {
                            val dayEventCount = events.count { it.startTime.toLocalDate() == day }
                            Column(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { onDateSelected(day) }
                                    .background(
                                        when {
                                            day == selectedDate -> MaterialTheme.colorScheme.primary
                                            day == today -> MaterialTheme.colorScheme.primaryContainer
                                            else -> Color.Transparent
                                        }
                                    )
                                    .padding(4.dp)
                                    .fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = day.dayOfMonth.toString(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = when {
                                        day == selectedDate -> MaterialTheme.colorScheme.onPrimary
                                        day == today -> MaterialTheme.colorScheme.primary
                                        else -> MaterialTheme.colorScheme.onSurface
                                    },
                                    fontWeight = if (day == today) FontWeight.Bold else FontWeight.Normal
                                )
                                if (dayEventCount > 0) {
                                    Row(horizontalArrangement = Arrangement.Center) {
                                        repeat(minOf(dayEventCount, 3)) {
                                            Box(
                                                modifier = Modifier
                                                    .size(4.dp)
                                                    .clip(CircleShape)
                                                    .background(
                                                        if (day == selectedDate)
                                                            MaterialTheme.colorScheme.onPrimary
                                                        else MaterialTheme.colorScheme.primary
                                                    )
                                            )
                                            Spacer(Modifier.width(2.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Divider(modifier = Modifier.padding(vertical = 8.dp))

        // Events for selected day
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.weight(1f)
        ) {
            if (eventsForDay.isEmpty()) {
                item {
                    Text(
                        "No events on ${selectedDate.format(DateTimeFormatter.ofPattern("EEEE, MMM d"))}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            } else {
                items(eventsForDay, key = { it.id }) { event ->
                    EventListItem(event = event, onClick = { onEventClick(event.id) })
                }
            }
        }
    }
}

@Composable
fun AgendaView(
    selectedDate: LocalDate,
    events: List<Event>,
    onEventClick: (Long) -> Unit,
    onEventLongClick: (Event) -> Unit = {}
) {
    val grouped = events.groupBy { it.startTime.toLocalDate() }.toSortedMap()

    if (grouped.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Outlined.EventNote,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    "No upcoming events",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    } else {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 80.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            grouped.forEach { (date, dayEvents) ->
                stickyHeader {
                    Surface(color = MaterialTheme.colorScheme.background) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val isToday = date == LocalDate.now()
                            Text(
                                text = if (isToday) "Today" else date.format(
                                    DateTimeFormatter.ofPattern("EEEE, MMM d")
                                ),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isToday) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface
                            )
                            if (isToday) {
                                Spacer(Modifier.width(8.dp))
                                Badge { Text(dayEvents.size.toString()) }
                            }
                        }
                    }
                }
                items(dayEvents, key = { it.id }) { event ->
                    EventListItem(
                        event = event,
                        onClick = { onEventClick(event.id) },
                        onLongClick = { onEventLongClick(event) },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 3.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun EventListItem(
    event: Event,
    onClick: () -> Unit,
    onLongClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val timeFormatter = DateTimeFormatter.ofPattern("h:mm a")
    val priorityColor = when (event.priority) {
        Priority.LOW -> PriorityLow
        Priority.MEDIUM -> PriorityMedium
        Priority.HIGH -> PriorityHigh
        Priority.URGENT -> PriorityUrgent
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .combinedClickable(onClick = onClick, onLongClick = onLongClick),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Category color indicator
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(48.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color(event.categoryColor))
            )
            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = event.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                        textDecoration = if (event.isCompleted)
                            androidx.compose.ui.text.style.TextDecoration.LineThrough
                        else null
                    )
                    // Priority badge
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(priorityColor.copy(alpha = 0.15f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = event.priority.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = priorityColor
                        )
                    }
                }

                Spacer(Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Outlined.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = if (event.isAllDay) "All day"
                        else "${event.startTime.format(timeFormatter)} - ${event.endTime.format(timeFormatter)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (event.location.isNotBlank()) {
                        Icon(
                            Icons.Outlined.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = event.location,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                if (event.categoryName.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = event.categoryName,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(event.categoryColor)
                    )
                }
            }

            if (event.aiOptimized) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = "AI optimized",
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.tertiary
                )
            }
        }
    }
}

@Composable
fun SearchResultsList(
    results: List<Event>,
    onEventClick: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    if (results.isEmpty()) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No results found", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            modifier = modifier,
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(results, key = { it.id }) { event ->
                EventListItem(event = event, onClick = { onEventClick(event.id) })
            }
        }
    }
}
