package com.duxdiscimus.scheduleai.domain.model

import java.time.DayOfWeek
import java.time.LocalTime

data class Rule(
    val id: Long = 0,
    val name: String,
    val description: String = "",
    val type: RuleType,
    val isEnabled: Boolean = true,
    val priority: Int = 0,
    val parameters: Map<String, String> = emptyMap()
) {
    // Convenience accessors for common rule parameters
    val startTime: LocalTime?
        get() = parameters["startTime"]?.let { LocalTime.parse(it) }

    val endTime: LocalTime?
        get() = parameters["endTime"]?.let { LocalTime.parse(it) }

    val daysOfWeek: Set<DayOfWeek>
        get() = parameters["daysOfWeek"]
            ?.split(",")
            ?.mapNotNull { runCatching { DayOfWeek.valueOf(it) }.getOrNull() }
            ?.toSet()
            ?: emptySet()

    val maxEventsPerDay: Int
        get() = parameters["maxEventsPerDay"]?.toIntOrNull() ?: Int.MAX_VALUE

    val maxMeetingDurationMinutes: Int
        get() = parameters["maxMeetingDurationMinutes"]?.toIntOrNull() ?: Int.MAX_VALUE

    val requiredBreakMinutes: Int
        get() = parameters["requiredBreakMinutes"]?.toIntOrNull() ?: 0

    val categoryId: Long?
        get() = parameters["categoryId"]?.toLongOrNull()
}

enum class RuleType(val label: String, val description: String) {
    WORK_HOURS("Working Hours", "Only schedule events during work hours"),
    NO_MEETINGS("No Meeting Block", "Block time from meetings"),
    FOCUS_TIME("Focus Time", "Reserve deep work time"),
    BREAK_REQUIRED("Break Required", "Require breaks between events"),
    MAX_EVENTS_PER_DAY("Event Limit", "Limit events per day"),
    CATEGORY_RESTRICTION("Category Restriction", "Restrict when a category can be scheduled"),
    BUFFER_TIME("Buffer Time", "Add buffer between events"),
    MORNING_ROUTINE("Morning Routine", "Protect morning routine time"),
    EVENING_WIND_DOWN("Evening Wind-Down", "Protect evening time")
}
