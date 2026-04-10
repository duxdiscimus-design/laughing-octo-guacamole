package com.duxdiscimus.scheduleai.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.domain.model.Recurrence
import java.time.DayOfWeek
import java.time.LocalDateTime

@Entity(tableName = "events")
data class EventEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val description: String = "",
    val startTimeEpoch: Long,
    val endTimeEpoch: Long,
    val categoryId: Long = 0,
    val priority: String = Priority.MEDIUM.name,
    val recurrence: String = Recurrence.NONE.name,
    val recurrenceEndDateEpoch: Long? = null,
    val recurrenceDays: String = "",
    val reminderMinutes: Int = 15,
    val location: String = "",
    val isAllDay: Boolean = false,
    val isCompleted: Boolean = false,
    val notes: String = "",
    val aiOptimized: Boolean = false,
    val parentEventId: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    fun toDomain(categoryName: String = "Other", categoryColor: Int = 0xFF90A4AE.toInt()): Event {
        return Event(
            id = id,
            title = title,
            description = description,
            startTime = LocalDateTime.ofEpochSecond(startTimeEpoch, 0, java.time.ZoneOffset.UTC),
            endTime = LocalDateTime.ofEpochSecond(endTimeEpoch, 0, java.time.ZoneOffset.UTC),
            categoryId = categoryId,
            categoryName = categoryName,
            categoryColor = categoryColor,
            priority = Priority.valueOf(priority),
            recurrence = Recurrence.valueOf(recurrence),
            recurrenceEndDate = recurrenceEndDateEpoch?.let {
                LocalDateTime.ofEpochSecond(it, 0, java.time.ZoneOffset.UTC)
            },
            recurrenceDays = recurrenceDays.split(",")
                .filter { it.isNotBlank() }
                .mapNotNull { runCatching { DayOfWeek.valueOf(it) }.getOrNull() }
                .toSet(),
            reminderMinutes = reminderMinutes,
            location = location,
            isAllDay = isAllDay,
            isCompleted = isCompleted,
            notes = notes,
            aiOptimized = aiOptimized,
            parentEventId = parentEventId
        )
    }

    companion object {
        fun fromDomain(event: Event): EventEntity {
            return EventEntity(
                id = event.id,
                title = event.title,
                description = event.description,
                startTimeEpoch = event.startTime.toEpochSecond(java.time.ZoneOffset.UTC),
                endTimeEpoch = event.endTime.toEpochSecond(java.time.ZoneOffset.UTC),
                categoryId = event.categoryId,
                priority = event.priority.name,
                recurrence = event.recurrence.name,
                recurrenceEndDateEpoch = event.recurrenceEndDate?.toEpochSecond(java.time.ZoneOffset.UTC),
                recurrenceDays = event.recurrenceDays.joinToString(",") { it.name },
                reminderMinutes = event.reminderMinutes,
                location = event.location,
                isAllDay = event.isAllDay,
                isCompleted = event.isCompleted,
                notes = event.notes,
                aiOptimized = event.aiOptimized,
                parentEventId = event.parentEventId,
                updatedAt = System.currentTimeMillis()
            )
        }
    }
}
