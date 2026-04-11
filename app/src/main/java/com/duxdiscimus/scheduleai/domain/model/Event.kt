package com.duxdiscimus.scheduleai.domain.model

import androidx.compose.ui.graphics.Color
import java.time.DayOfWeek
import java.time.LocalDateTime

data class Event(
    val id: Long = 0,
    val title: String,
    val description: String = "",
    val startTime: LocalDateTime,
    val endTime: LocalDateTime,
    val categoryId: Long = 0,
    val categoryName: String = "Other",
    val categoryColor: Int = 0xFF90A4AE.toInt(),
    val priority: Priority = Priority.MEDIUM,
    val recurrence: Recurrence = Recurrence.NONE,
    val recurrenceEndDate: LocalDateTime? = null,
    val recurrenceDays: Set<DayOfWeek> = emptySet(),
    val reminderMinutes: Int = 15,
    val location: String = "",
    val isAllDay: Boolean = false,
    val isCompleted: Boolean = false,
    val notes: String = "",
    val aiOptimized: Boolean = false,
    val parentEventId: Long? = null
) {
    val durationMinutes: Long
        get() = java.time.Duration.between(startTime, endTime).toMinutes()

    val isOverlapping: Boolean = false

    fun overlapsWith(other: Event): Boolean {
        return startTime < other.endTime && endTime > other.startTime
    }
}

enum class Priority(val label: String, val order: Int) {
    LOW("Low", 0),
    MEDIUM("Medium", 1),
    HIGH("High", 2),
    URGENT("Urgent", 3)
}

enum class Recurrence(val label: String) {
    NONE("None"),
    DAILY("Daily"),
    WEEKDAYS("Weekdays"),
    WEEKLY("Weekly"),
    MONTHLY("Monthly"),
    CUSTOM("Custom")
}
