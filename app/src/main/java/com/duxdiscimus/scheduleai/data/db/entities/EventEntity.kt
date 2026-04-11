package com.duxdiscimus.scheduleai.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.domain.model.Recurrence
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

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
        val zoneId = ZoneId.systemDefault()
        return Event(
            id = id,
            title = title,
            description = description,
            startTime = Instant.ofEpochSecond(startTimeEpoch).atZone(zoneId).toLocalDateTime(),
            endTime = Instant.ofEpochSecond(endTimeEpoch).atZone(zoneId).toLocalDateTime(),
            categoryId = categoryId,
            categoryName = categoryName,
            categoryColor = categoryColor,
            priority = Priority.valueOf(priority),
            recurrence = Recurrence.valueOf(recurrence),
            recurrenceEndDate = recurrenceEndDateEpoch?.let { epochSec ->
                Instant.ofEpochSecond(epochSec).atZone(zoneId).toLocalDateTime()
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
            val zoneId = ZoneId.systemDefault()
            return EventEntity(
                id = event.id,
                title = event.title,
                description = event.description,
                startTimeEpoch = event.startTime.atZone(zoneId).toEpochSecond(),
                endTimeEpoch = event.endTime.atZone(zoneId).toEpochSecond(),
                categoryId = event.categoryId,
                priority = event.priority.name,
                recurrence = event.recurrence.name,
                recurrenceEndDateEpoch = event.recurrenceEndDate?.atZone(zoneId)?.toEpochSecond(),
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
