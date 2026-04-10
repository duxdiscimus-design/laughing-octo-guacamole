package com.duxdiscimus.scheduleai.ai

import com.duxdiscimus.scheduleai.domain.model.Category
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Rule
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Builds the system prompt and user context for the AI schedule assistant.
 *
 * The system prompt instructs Gemma to act as a schedule management assistant
 * and respond with both natural language and structured JSON commands.
 */
object SchedulePromptBuilder {
    private val dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    private val isoFmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME

    fun buildSystemPrompt(): String = """
You are an intelligent schedule management AI assistant powered by Gemma. You have full control over the user's schedule and can:
- Create, update, move, and delete events
- Create and manage scheduling rules
- Optimize the schedule for productivity, wellness, or balance
- Provide smart suggestions and insights

IMPORTANT: When performing schedule actions, always include a JSON command block in your response using this exact format. The JSON must be valid and on its own line or in a code block.

AVAILABLE ACTIONS:

1. Create Event:
{"action":"create_event","title":"Meeting","start_time":"2024-01-15T09:00:00","end_time":"2024-01-15T10:00:00","description":"","priority":"MEDIUM","location":"","reminder_minutes":15,"recurrence":"NONE","category_id":1}

2. Update Event:
{"action":"update_event","event_id":123,"title":"Updated Title","start_time":"2024-01-15T10:00:00","end_time":"2024-01-15T11:00:00"}

3. Delete Event:
{"action":"delete_event","event_id":123,"reason":"User requested deletion"}

4. Move Event:
{"action":"move_event","event_id":123,"new_start_time":"2024-01-15T14:00:00","new_end_time":"2024-01-15T15:00:00"}

5. Create Rule:
{"action":"create_rule","name":"Work Hours","type":"WORK_HOURS","description":"Only schedule work events 9-5","parameters":{"startTime":"09:00","endTime":"17:00","daysOfWeek":"MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"}}

6. Toggle Rule:
{"action":"toggle_rule","rule_id":1,"enabled":true}

7. Optimize Schedule:
{"action":"optimize_schedule","goal":"BALANCE"}

8. Multiple commands:
{"action":"multi_command","commands":[...]}

PRIORITIES: LOW, MEDIUM, HIGH, URGENT
RECURRENCES: NONE, DAILY, WEEKDAYS, WEEKLY, MONTHLY
RULE TYPES: WORK_HOURS, NO_MEETINGS, FOCUS_TIME, BREAK_REQUIRED, MAX_EVENTS_PER_DAY, BUFFER_TIME, MORNING_ROUTINE, EVENING_WIND_DOWN

Always be conversational, helpful, and explain what you're doing. If you're taking an action, describe it in natural language first, then include the JSON command.
""".trimIndent()

    fun buildContextPrompt(
        events: List<Event>,
        rules: List<Rule>,
        categories: List<Category>,
        now: LocalDateTime = LocalDateTime.now()
    ): String {
        val sb = StringBuilder()
        sb.appendLine("=== CURRENT SCHEDULE CONTEXT ===")
        sb.appendLine("Current time: ${now.format(dtf)}")
        sb.appendLine()

        // Upcoming events (next 7 days)
        val upcomingEvents = events
            .filter { it.startTime >= now && it.startTime <= now.plusDays(7) }
            .sortedBy { it.startTime }
            .take(20)

        sb.appendLine("UPCOMING EVENTS (next 7 days):")
        if (upcomingEvents.isEmpty()) {
            sb.appendLine("  No upcoming events")
        } else {
            upcomingEvents.forEach { event ->
                sb.appendLine(
                    "  [ID:${event.id}] ${event.startTime.format(dtf)} - ${event.endTime.format(dtf)}: " +
                    "${event.title} (${event.priority.label}, ${event.categoryName})" +
                    if (event.location.isNotBlank()) " @ ${event.location}" else ""
                )
            }
        }
        sb.appendLine()

        // Today's events
        val todayEvents = events.filter {
            it.startTime.toLocalDate() == now.toLocalDate()
        }.sortedBy { it.startTime }

        sb.appendLine("TODAY'S SCHEDULE:")
        if (todayEvents.isEmpty()) {
            sb.appendLine("  No events today")
        } else {
            todayEvents.forEach { event ->
                val status = when {
                    event.isCompleted -> "✓"
                    event.endTime < now -> "past"
                    event.startTime <= now -> "now"
                    else -> "upcoming"
                }
                sb.appendLine("  [$status] [ID:${event.id}] ${event.startTime.format(dtf)}: ${event.title}")
            }
        }
        sb.appendLine()

        // Active rules
        val enabledRules = rules.filter { it.isEnabled }
        sb.appendLine("ACTIVE RULES:")
        if (enabledRules.isEmpty()) {
            sb.appendLine("  No active rules")
        } else {
            enabledRules.forEach { rule ->
                sb.appendLine("  [ID:${rule.id}] ${rule.name} (${rule.type.label})")
            }
        }
        sb.appendLine()

        // Categories
        sb.appendLine("CATEGORIES:")
        categories.forEach { cat ->
            sb.appendLine("  [ID:${cat.id}] ${cat.name}")
        }
        sb.appendLine()

        // Schedule stats
        val totalEvents = events.filter {
            it.startTime.toLocalDate() >= now.toLocalDate() &&
            it.startTime.toLocalDate() <= now.toLocalDate().plusDays(7)
        }
        val busyDays = totalEvents.groupBy { it.startTime.toLocalDate() }
        val avgEventsPerDay = if (busyDays.isNotEmpty()) busyDays.values.map { it.size }.average() else 0.0

        sb.appendLine("SCHEDULE STATS (next 7 days):")
        sb.appendLine("  Total events: ${totalEvents.size}")
        sb.appendLine("  Avg events/day: ${"%.1f".format(avgEventsPerDay)}")
        val conflicts = findConflicts(events.filter { it.startTime >= now })
        if (conflicts.isNotEmpty()) {
            sb.appendLine("  Conflicts detected: ${conflicts.size}")
            conflicts.take(3).forEach { (a, b) ->
                sb.appendLine("    ⚠ '${a.title}' overlaps with '${b.title}'")
            }
        }

        return sb.toString()
    }

    fun buildFullPrompt(
        userMessage: String,
        events: List<Event>,
        rules: List<Rule>,
        categories: List<Category>,
        conversationHistory: List<ChatMessage> = emptyList(),
        now: LocalDateTime = LocalDateTime.now()
    ): String {
        val context = buildContextPrompt(events, rules, categories, now)
        val system = buildSystemPrompt()

        val sb = StringBuilder()
        sb.appendLine("<start_of_turn>system")
        sb.appendLine(system)
        sb.appendLine()
        sb.appendLine(context)
        sb.appendLine("<end_of_turn>")

        // Add recent conversation history (last 6 turns)
        conversationHistory.takeLast(6).forEach { msg ->
            sb.appendLine("<start_of_turn>${if (msg.isUser) "user" else "model"}")
            sb.appendLine(msg.content)
            sb.appendLine("<end_of_turn>")
        }

        // Current user message
        sb.appendLine("<start_of_turn>user")
        sb.appendLine(userMessage)
        sb.appendLine("<end_of_turn>")
        sb.append("<start_of_turn>model")

        return sb.toString()
    }

    private fun findConflicts(events: List<Event>): List<Pair<Event, Event>> {
        val conflicts = mutableListOf<Pair<Event, Event>>()
        val sorted = events.sortedBy { it.startTime }
        for (i in sorted.indices) {
            for (j in i + 1 until sorted.size) {
                if (sorted[j].startTime >= sorted[i].endTime) break
                if (sorted[i].overlapsWith(sorted[j])) {
                    conflicts.add(sorted[i] to sorted[j])
                }
            }
        }
        return conflicts
    }
}

data class ChatMessage(
    val content: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val commands: List<ScheduleCommand> = emptyList(),
    val isLoading: Boolean = false
)
