package com.duxdiscimus.scheduleai.ui.screens.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.duxdiscimus.scheduleai.data.repository.CategoryRepository
import com.duxdiscimus.scheduleai.data.repository.EventRepository
import com.duxdiscimus.scheduleai.domain.model.Category
import com.duxdiscimus.scheduleai.domain.model.Event
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.YearMonth
import javax.inject.Inject

@HiltViewModel
class ScheduleViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val categoryRepository: CategoryRepository
) : ViewModel() {

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    val selectedDate: StateFlow<LocalDate> = _selectedDate.asStateFlow()

    private val _viewMode = MutableStateFlow(CalendarViewMode.WEEK)
    val viewMode: StateFlow<CalendarViewMode> = _viewMode.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _isSearchActive = MutableStateFlow(false)
    val isSearchActive: StateFlow<Boolean> = _isSearchActive.asStateFlow()

    private val _selectedCategoryFilter = MutableStateFlow<Long?>(null)

    val categories: StateFlow<List<Category>> = categoryRepository.getAllCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    @OptIn(ExperimentalCoroutinesApi::class)
    val allEvents: StateFlow<List<Event>> = eventRepository.getAllEvents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val eventsForSelectedDate: StateFlow<List<Event>> = combine(
        allEvents, _selectedDate
    ) { events, date ->
        events.filter { event ->
            event.startTime.toLocalDate() == date
        }.sortedBy { it.startTime }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val upcomingEvents: StateFlow<List<Event>> = eventRepository
        .getUpcomingEvents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val searchResults: StateFlow<List<Event>> = combine(
        _searchQuery, allEvents
    ) { query, events ->
        if (query.isBlank()) emptyList()
        else events.filter { event ->
            event.title.contains(query, ignoreCase = true) ||
            event.description.contains(query, ignoreCase = true) ||
            event.location.contains(query, ignoreCase = true) ||
            event.categoryName.contains(query, ignoreCase = true)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun selectDate(date: LocalDate) {
        _selectedDate.value = date
    }

    fun setViewMode(mode: CalendarViewMode) {
        _viewMode.value = mode
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setSearchActive(active: Boolean) {
        _isSearchActive.value = active
        if (!active) _searchQuery.value = ""
    }

    fun markEventCompleted(eventId: Long, completed: Boolean) {
        viewModelScope.launch {
            eventRepository.setEventCompleted(eventId, completed)
        }
    }

    fun deleteEvent(event: Event) {
        viewModelScope.launch {
            eventRepository.deleteEvent(event)
        }
    }

    fun getEventsForWeek(weekStart: LocalDate): List<Event> {
        val weekEnd = weekStart.plusDays(7)
        return allEvents.value.filter { event ->
            val eventDate = event.startTime.toLocalDate()
            eventDate >= weekStart && eventDate < weekEnd
        }
    }

    fun getEventDensityForMonth(month: YearMonth): Map<LocalDate, Int> {
        return allEvents.value
            .filter { YearMonth.from(it.startTime.toLocalDate()) == month }
            .groupBy { it.startTime.toLocalDate() }
            .mapValues { it.value.size }
    }

    fun navigateToPreviousPeriod() {
        _selectedDate.value = when (_viewMode.value) {
            CalendarViewMode.WEEK -> _selectedDate.value.minusWeeks(1)
            CalendarViewMode.MONTH -> _selectedDate.value.minusMonths(1)
            CalendarViewMode.AGENDA -> _selectedDate.value.minusWeeks(1)
        }
    }

    fun navigateToNextPeriod() {
        _selectedDate.value = when (_viewMode.value) {
            CalendarViewMode.WEEK -> _selectedDate.value.plusWeeks(1)
            CalendarViewMode.MONTH -> _selectedDate.value.plusMonths(1)
            CalendarViewMode.AGENDA -> _selectedDate.value.plusWeeks(1)
        }
    }

    fun navigateToToday() {
        _selectedDate.value = LocalDate.now()
    }
}

enum class CalendarViewMode { WEEK, MONTH, AGENDA }
