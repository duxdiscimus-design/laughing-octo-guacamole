package com.duxdiscimus.scheduleai.ai

import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Priority
import com.duxdiscimus.scheduleai.domain.model.Recurrence
import com.duxdiscimus.scheduleai.domain.model.Rule
import com.duxdiscimus.scheduleai.domain.model.RuleType
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Represents a parsed command from the AI assistant that can be executed
 * to modify the schedule.
 */
sealed class ScheduleCommand {
    data class CreateEvent(
        val title: String,
        val startTime: LocalDateTime,
        val endTime: LocalDateTime,
        val categoryId: Long = 0,
        val description: String = "",
        val priority: Priority = Priority.MEDIUM,
        val location: String = "",
        val reminderMinutes: Int = 15,
        val recurrence: Recurrence = Recurrence.NONE
    ) : ScheduleCommand()

    data class UpdateEvent(
        val eventId: Long,
        val title: String? = null,
        val startTime: LocalDateTime? = null,
        val endTime: LocalDateTime? = null,
        val description: String? = null,
        val priority: Priority? = null,
        val location: String? = null,
        val reminderMinutes: Int? = null,
        val categoryId: Long? = null
    ) : ScheduleCommand()

    data class DeleteEvent(
        val eventId: Long,
        val reason: String = ""
    ) : ScheduleCommand()

    data class MoveEvent(
        val eventId: Long,
        val newStartTime: LocalDateTime,
        val newEndTime: LocalDateTime
    ) : ScheduleCommand()

    data class CreateRule(
        val name: String,
        val type: RuleType,
        val description: String = "",
        val parameters: Map<String, String> = emptyMap()
    ) : ScheduleCommand()

    data class DeleteRule(val ruleId: Long) : ScheduleCommand()

    data class ToggleRule(val ruleId: Long, val enabled: Boolean) : ScheduleCommand()

    data class OptimizeSchedule(
        val optimizationGoal: OptimizationGoal = OptimizationGoal.BALANCE,
        val dateRange: Pair<LocalDateTime, LocalDateTime>? = null
    ) : ScheduleCommand()

    data class SetSetting(
        val key: String,
        val value: String
    ) : ScheduleCommand()

    data class ShowInfo(val message: String) : ScheduleCommand()

    data class MultiCommand(val commands: List<ScheduleCommand>) : ScheduleCommand()
}

enum class OptimizationGoal {
    BALANCE,
    PRODUCTIVITY,
    WELLNESS,
    FOCUS_TIME,
    MINIMIZE_CONFLICTS
}

/**
 * Parses the AI response to extract executable schedule commands.
 * The AI is prompted to return structured JSON commands alongside natural language.
 */
object ScheduleCommandParser {
    private val gson = Gson()
    private val dtf = DateTimeFormatter.ISO_LOCAL_DATE_TIME

    fun parseCommands(aiResponse: String): List<ScheduleCommand> {
        val commands = mutableListOf<ScheduleCommand>()

        // Extract JSON blocks from the response
        val jsonBlocks = extractJsonBlocks(aiResponse)
        for (json in jsonBlocks) {
            try {
                val obj = JsonParser.parseString(json).asJsonObject
                parseCommandObject(obj)?.let { commands.add(it) }
            } catch (e: Exception) {
                // Skip malformed JSON
            }
        }
        return commands
    }

    private fun extractJsonBlocks(text: String): List<String> {
        val blocks = mutableListOf<String>()
        var i = 0
        while (i < text.length) {
            if (text[i] == '{') {
                var depth = 0
                var j = i
                while (j < text.length) {
                    when (text[j]) {
                        '{' -> depth++
                        '}' -> {
                            depth--
                            if (depth == 0) {
                                blocks.add(text.substring(i, j + 1))
                                i = j
                                break
                            }
                        }
                    }
                    j++
                }
            }
            i++
        }
        return blocks
    }

    private fun parseCommandObject(obj: JsonObject): ScheduleCommand? {
        return when (obj.get("action")?.asString) {
            "create_event" -> parseCreateEvent(obj)
            "update_event" -> parseUpdateEvent(obj)
            "delete_event" -> parseDeleteEvent(obj)
            "move_event" -> parseMoveEvent(obj)
            "create_rule" -> parseCreateRule(obj)
            "delete_rule" -> parseDeleteRule(obj)
            "toggle_rule" -> parseToggleRule(obj)
            "optimize_schedule" -> parseOptimizeSchedule(obj)
            "set_setting" -> parseSetSetting(obj)
            "multi_command" -> parseMultiCommand(obj)
            else -> null
        }
    }

    private fun parseCreateEvent(obj: JsonObject): ScheduleCommand.CreateEvent? {
        return try {
            ScheduleCommand.CreateEvent(
                title = obj.get("title").asString,
                startTime = LocalDateTime.parse(obj.get("start_time").asString, dtf),
                endTime = LocalDateTime.parse(obj.get("end_time").asString, dtf),
                description = obj.get("description")?.asString ?: "",
                priority = obj.get("priority")?.asString?.let {
                    runCatching { Priority.valueOf(it.uppercase()) }.getOrNull()
                } ?: Priority.MEDIUM,
                location = obj.get("location")?.asString ?: "",
                reminderMinutes = obj.get("reminder_minutes")?.asInt ?: 15,
                recurrence = obj.get("recurrence")?.asString?.let {
                    runCatching { Recurrence.valueOf(it.uppercase()) }.getOrNull()
                } ?: Recurrence.NONE,
                categoryId = obj.get("category_id")?.asLong ?: 0
            )
        } catch (e: Exception) { null }
    }

    private fun parseUpdateEvent(obj: JsonObject): ScheduleCommand.UpdateEvent? {
        return try {
            ScheduleCommand.UpdateEvent(
                eventId = obj.get("event_id").asLong,
                title = obj.get("title")?.asString,
                startTime = obj.get("start_time")?.asString?.let {
                    runCatching { LocalDateTime.parse(it, dtf) }.getOrNull()
                },
                endTime = obj.get("end_time")?.asString?.let {
                    runCatching { LocalDateTime.parse(it, dtf) }.getOrNull()
                },
                description = obj.get("description")?.asString,
                priority = obj.get("priority")?.asString?.let {
                    runCatching { Priority.valueOf(it.uppercase()) }.getOrNull()
                },
                location = obj.get("location")?.asString,
                reminderMinutes = obj.get("reminder_minutes")?.asInt,
                categoryId = obj.get("category_id")?.asLong
            )
        } catch (e: Exception) { null }
    }

    private fun parseDeleteEvent(obj: JsonObject): ScheduleCommand.DeleteEvent? {
        return try {
            ScheduleCommand.DeleteEvent(
                eventId = obj.get("event_id").asLong,
                reason = obj.get("reason")?.asString ?: ""
            )
        } catch (e: Exception) { null }
    }

    private fun parseMoveEvent(obj: JsonObject): ScheduleCommand.MoveEvent? {
        return try {
            ScheduleCommand.MoveEvent(
                eventId = obj.get("event_id").asLong,
                newStartTime = LocalDateTime.parse(obj.get("new_start_time").asString, dtf),
                newEndTime = LocalDateTime.parse(obj.get("new_end_time").asString, dtf)
            )
        } catch (e: Exception) { null }
    }

    private fun parseCreateRule(obj: JsonObject): ScheduleCommand.CreateRule? {
        return try {
            val params = obj.get("parameters")?.asJsonObject?.entrySet()
                ?.associate { it.key to it.value.asString }
                ?: emptyMap()
            ScheduleCommand.CreateRule(
                name = obj.get("name").asString,
                type = RuleType.valueOf(obj.get("type").asString.uppercase()),
                description = obj.get("description")?.asString ?: "",
                parameters = params
            )
        } catch (e: Exception) { null }
    }

    private fun parseDeleteRule(obj: JsonObject): ScheduleCommand.DeleteRule? {
        return try {
            ScheduleCommand.DeleteRule(obj.get("rule_id").asLong)
        } catch (e: Exception) { null }
    }

    private fun parseToggleRule(obj: JsonObject): ScheduleCommand.ToggleRule? {
        return try {
            ScheduleCommand.ToggleRule(
                ruleId = obj.get("rule_id").asLong,
                enabled = obj.get("enabled").asBoolean
            )
        } catch (e: Exception) { null }
    }

    private fun parseOptimizeSchedule(obj: JsonObject): ScheduleCommand.OptimizeSchedule {
        val goal = obj.get("goal")?.asString?.let {
            runCatching { OptimizationGoal.valueOf(it.uppercase()) }.getOrNull()
        } ?: OptimizationGoal.BALANCE
        return ScheduleCommand.OptimizeSchedule(optimizationGoal = goal)
    }

    private fun parseSetSetting(obj: JsonObject): ScheduleCommand.SetSetting? {
        return try {
            ScheduleCommand.SetSetting(
                key = obj.get("key").asString,
                value = obj.get("value").asString
            )
        } catch (e: Exception) { null }
    }

    private fun parseMultiCommand(obj: JsonObject): ScheduleCommand.MultiCommand? {
        return try {
            val commands = obj.get("commands").asJsonArray
                .mapNotNull { el ->
                    runCatching { parseCommandObject(el.asJsonObject) }.getOrNull()
                }
            ScheduleCommand.MultiCommand(commands)
        } catch (e: Exception) { null }
    }
}
