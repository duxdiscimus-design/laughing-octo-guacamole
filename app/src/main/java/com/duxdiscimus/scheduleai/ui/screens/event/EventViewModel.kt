package com.duxdiscimus.scheduleai.ui.screens.event

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.duxdiscimus.scheduleai.data.repository.CategoryRepository
import com.duxdiscimus.scheduleai.data.repository.EventRepository
import com.duxdiscimus.scheduleai.domain.model.Category
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.domain.model.Recurrence
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

@HiltViewModel
class EventViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val categoryRepository: CategoryRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: Long? = savedStateHandle.get<Long>("eventId")
        ?.takeIf { it != -1L }

    val categories: StateFlow<List<Category>> = categoryRepository.getAllCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _uiState = MutableStateFlow(EventUiState())
    val uiState: StateFlow<EventUiState> = _uiState.asStateFlow()

    init {
        if (eventId != null) {
            loadEvent(eventId)
        } else {
            // Default new event: start in 1 hour, 1 hour duration
            val start = LocalDateTime.now().plusHours(1).withMinute(0).withSecond(0).withNano(0)
            _uiState.value = EventUiState(
                startTime = start,
                endTime = start.plusHours(1),
                isNew = true
            )
        }
    }

    private fun loadEvent(id: Long) {
        viewModelScope.launch {
            val event = eventRepository.getEventById(id)
            if (event != null) {
                _uiState.value = EventUiState(
                    id = event.id,
                    title = event.title,
                    description = event.description,
                    startTime = event.startTime,
                    endTime = event.endTime,
                    categoryId = event.categoryId,
                    priority = event.priority,
                    recurrence = event.recurrence,
                    reminderMinutes = event.reminderMinutes,
                    location = event.location,
                    isAllDay = event.isAllDay,
                    notes = event.notes,
                    isNew = false
                )
            }
        }
    }

    fun updateTitle(title: String) {
        _uiState.value = _uiState.value.copy(title = title, titleError = null)
    }

    fun updateDescription(desc: String) {
        _uiState.value = _uiState.value.copy(description = desc)
    }

    fun updateStartTime(time: LocalDateTime) {
        val endTime = if (time >= _uiState.value.endTime) {
            time.plusHours(1)
        } else {
            _uiState.value.endTime
        }
        _uiState.value = _uiState.value.copy(startTime = time, endTime = endTime)
    }

    fun updateEndTime(time: LocalDateTime) {
        _uiState.value = _uiState.value.copy(endTime = time, endTimeError = null)
    }

    fun updateCategory(categoryId: Long) {
        _uiState.value = _uiState.value.copy(categoryId = categoryId)
    }

    fun updatePriority(priority: Priority) {
        _uiState.value = _uiState.value.copy(priority = priority)
    }

    fun updateRecurrence(recurrence: Recurrence) {
        _uiState.value = _uiState.value.copy(recurrence = recurrence)
    }

    fun updateReminderMinutes(minutes: Int) {
        _uiState.value = _uiState.value.copy(reminderMinutes = minutes)
    }

    fun updateLocation(location: String) {
        _uiState.value = _uiState.value.copy(location = location)
    }

    fun updateIsAllDay(allDay: Boolean) {
        _uiState.value = _uiState.value.copy(isAllDay = allDay)
    }

    fun updateNotes(notes: String) {
        _uiState.value = _uiState.value.copy(notes = notes)
    }

    fun saveEvent(onSuccess: () -> Unit, onError: (String) -> Unit) {
        val state = _uiState.value
        var hasError = false

        if (state.title.isBlank()) {
            _uiState.value = state.copy(titleError = "Title is required")
            hasError = true
        }

        if (state.endTime <= state.startTime) {
            _uiState.value = _uiState.value.copy(endTimeError = "End time must be after start time")
            hasError = true
        }

        if (hasError) return

        viewModelScope.launch {
            try {
                val event = Event(
                    id = state.id ?: 0,
                    title = state.title.trim(),
                    description = state.description,
                    startTime = state.startTime,
                    endTime = state.endTime,
                    categoryId = state.categoryId,
                    priority = state.priority,
                    recurrence = state.recurrence,
                    reminderMinutes = state.reminderMinutes,
                    location = state.location,
                    isAllDay = state.isAllDay,
                    notes = state.notes
                )
                if (state.isNew) {
                    eventRepository.saveEvent(event)
                } else {
                    eventRepository.updateEvent(event)
                }
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Failed to save event")
            }
        }
    }

    fun deleteEvent(onSuccess: () -> Unit) {
        val id = _uiState.value.id ?: return
        viewModelScope.launch {
            eventRepository.deleteEventById(id)
            onSuccess()
        }
    }
}

data class EventUiState(
    val id: Long? = null,
    val title: String = "",
    val description: String = "",
    val startTime: LocalDateTime = LocalDateTime.now().plusHours(1).withMinute(0).withSecond(0).withNano(0),
    val endTime: LocalDateTime = LocalDateTime.now().plusHours(2).withMinute(0).withSecond(0).withNano(0),
    val categoryId: Long = 1,
    val priority: Priority = Priority.MEDIUM,
    val recurrence: Recurrence = Recurrence.NONE,
    val reminderMinutes: Int = 15,
    val location: String = "",
    val isAllDay: Boolean = false,
    val notes: String = "",
    val isNew: Boolean = true,
    val titleError: String? = null,
    val endTimeError: String? = null
)
