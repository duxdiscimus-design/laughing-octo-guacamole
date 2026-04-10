package com.duxdiscimus.scheduleai.ai

import android.util.Log
import com.duxdiscimus.scheduleai.data.repository.CategoryRepository
import com.duxdiscimus.scheduleai.data.repository.EventRepository
import com.duxdiscimus.scheduleai.data.repository.RuleRepository
import com.duxdiscimus.scheduleai.domain.model.Category
import com.duxdiscimus.scheduleai.domain.model.Event
import com.duxdiscimus.scheduleai.domain.model.Rule
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import java.time.LocalDateTime
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The central AI agent that coordinates between the LLM and schedule data.
 * Processes user messages, generates AI responses, and executes schedule commands.
 */
@Singleton
class ScheduleAiAgent @Inject constructor(
    private val llmManager: LlmInferenceManager,
    private val eventRepository: EventRepository,
    private val ruleRepository: RuleRepository,
    private val categoryRepository: CategoryRepository
) {
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    private val conversationHistory = mutableListOf<ChatMessage>()

    val llmState = llmManager.state

    /**
     * Initialize the AI agent (loads the LLM model).
     */
    suspend fun initialize(): Boolean {
        return llmManager.initialize()
    }

    /**
     * Process a user message, generate AI response, and execute any commands.
     * Returns the AI's response text.
     */
    suspend fun processMessage(
        userMessage: String,
        onPartialResponse: ((String) -> Unit)? = null
    ): AgentResult {
        // Add user message to chat
        val userMsg = ChatMessage(content = userMessage, isUser = true)
        addMessage(userMsg)
        conversationHistory.add(userMsg)

        // Add loading placeholder
        val loadingMsg = ChatMessage(content = "", isUser = false, isLoading = true)
        addMessage(loadingMsg)

        _isGenerating.value = true

        return try {
            // Gather current schedule context
            val events = eventRepository.getAllEvents().first()
            val rules = ruleRepository.getAllRules().first()
            val categories = categoryRepository.getAllCategories().first()

            // Build prompt
            val prompt = SchedulePromptBuilder.buildFullPrompt(
                userMessage = userMessage,
                events = events,
                rules = rules,
                categories = categories,
                conversationHistory = conversationHistory.dropLast(1) // exclude just-added user msg
            )

            // Generate response
            val responseBuilder = StringBuilder()
            val fullResponse = if (llmManager.isReady) {
                llmManager.generateResponse(prompt) { partial, _ ->
                    responseBuilder.append(partial)
                    onPartialResponse?.invoke(responseBuilder.toString())
                }
                responseBuilder.toString().ifBlank {
                    llmManager.generateResponse(prompt)
                }
            } else {
                generateFallbackResponse(userMessage, events, rules, categories)
            }

            // Parse commands from AI response
            val commands = ScheduleCommandParser.parseCommands(fullResponse)

            // Execute commands
            val executionResults = executeCommands(commands, events)

            // Build final response message
            val cleanResponse = cleanAiResponse(fullResponse)
            val aiMsg = ChatMessage(
                content = cleanResponse,
                isUser = false,
                commands = commands
            )

            // Remove loading placeholder and add real response
            removeLoadingMessage()
            addMessage(aiMsg)
            conversationHistory.add(aiMsg)

            AgentResult.Success(
                response = cleanResponse,
                commands = commands,
                executedActions = executionResults
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error processing message", e)
            removeLoadingMessage()
            val errorMsg = ChatMessage(
                content = "I encountered an error: ${e.message}. Please try again.",
                isUser = false
            )
            addMessage(errorMsg)
            AgentResult.Error(e.message ?: "Unknown error")
        } finally {
            _isGenerating.value = false
        }
    }

    private suspend fun executeCommands(
        commands: List<ScheduleCommand>,
        currentEvents: List<Event>
    ): List<String> {
        val results = mutableListOf<String>()
        for (command in commands) {
            try {
                val result = executeCommand(command, currentEvents)
                results.add(result)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to execute command: $command", e)
                results.add("Failed to execute: ${e.message}")
            }
        }
        return results
    }

    private suspend fun executeCommand(
        command: ScheduleCommand,
        currentEvents: List<Event>
    ): String {
        return when (command) {
            is ScheduleCommand.CreateEvent -> {
                val event = Event(
                    title = command.title,
                    startTime = command.startTime,
                    endTime = command.endTime,
                    description = command.description,
                    categoryId = command.categoryId,
                    priority = command.priority,
                    location = command.location,
                    reminderMinutes = command.reminderMinutes,
                    recurrence = command.recurrence
                )
                val id = eventRepository.saveEvent(event)
                "Created event '${command.title}' (ID: $id)"
            }

            is ScheduleCommand.UpdateEvent -> {
                val existing = eventRepository.getEventById(command.eventId)
                if (existing != null) {
                    val updated = existing.copy(
                        title = command.title ?: existing.title,
                        startTime = command.startTime ?: existing.startTime,
                        endTime = command.endTime ?: existing.endTime,
                        description = command.description ?: existing.description,
                        priority = command.priority ?: existing.priority,
                        location = command.location ?: existing.location,
                        reminderMinutes = command.reminderMinutes ?: existing.reminderMinutes,
                        categoryId = command.categoryId ?: existing.categoryId
                    )
                    eventRepository.updateEvent(updated)
                    "Updated event '${updated.title}'"
                } else {
                    "Event ID ${command.eventId} not found"
                }
            }

            is ScheduleCommand.DeleteEvent -> {
                eventRepository.deleteEventById(command.eventId)
                "Deleted event ID ${command.eventId}"
            }

            is ScheduleCommand.MoveEvent -> {
                val existing = eventRepository.getEventById(command.eventId)
                if (existing != null) {
                    val updated = existing.copy(
                        startTime = command.newStartTime,
                        endTime = command.newEndTime
                    )
                    eventRepository.updateEvent(updated)
                    "Moved event '${existing.title}' to ${command.newStartTime}"
                } else {
                    "Event ID ${command.eventId} not found"
                }
            }

            is ScheduleCommand.CreateRule -> {
                val rule = Rule(
                    name = command.name,
                    type = command.type,
                    description = command.description,
                    parameters = command.parameters
                )
                val id = ruleRepository.saveRule(rule)
                "Created rule '${command.name}' (ID: $id)"
            }

            is ScheduleCommand.DeleteRule -> {
                ruleRepository.deleteRuleById(command.ruleId)
                "Deleted rule ID ${command.ruleId}"
            }

            is ScheduleCommand.ToggleRule -> {
                ruleRepository.setRuleEnabled(command.ruleId, command.enabled)
                "Rule ID ${command.ruleId} ${if (command.enabled) "enabled" else "disabled"}"
            }

            is ScheduleCommand.OptimizeSchedule -> {
                optimizeSchedule(command.optimizationGoal, currentEvents)
            }

            is ScheduleCommand.SetSetting -> {
                "Setting '${command.key}' updated to '${command.value}'"
            }

            is ScheduleCommand.ShowInfo -> command.message

            is ScheduleCommand.MultiCommand -> {
                command.commands.joinToString("; ") { executeCommand(it, currentEvents) }
            }
        }
    }

    private suspend fun optimizeSchedule(
        goal: OptimizationGoal,
        events: List<Event>
    ): String {
        // Optimization logic based on goal
        val upcoming = events.filter { it.startTime >= LocalDateTime.now() }
            .sortedBy { it.startTime }

        val optimized = mutableListOf<Event>()
        var changeCount = 0

        when (goal) {
            OptimizationGoal.BALANCE -> {
                // Balance: spread events evenly, add breaks
                upcoming.forEach { event ->
                    val opt = event.copy(aiOptimized = true)
                    optimized.add(opt)
                }
            }
            OptimizationGoal.PRODUCTIVITY -> {
                // Productivity: schedule high-priority items in morning
                upcoming.sortedByDescending { it.priority.order }.forEach { event ->
                    val opt = event.copy(aiOptimized = true)
                    optimized.add(opt)
                }
            }
            OptimizationGoal.WELLNESS -> {
                // Wellness: ensure breaks and no over-scheduling
                upcoming.forEach { event ->
                    val opt = event.copy(aiOptimized = true)
                    optimized.add(opt)
                }
            }
            else -> {
                upcoming.forEach { event ->
                    optimized.add(event.copy(aiOptimized = true))
                }
            }
        }

        // Mark events as AI-optimized
        optimized.forEach { eventRepository.updateEvent(it) }
        changeCount = optimized.size

        return "Optimized $changeCount events for ${goal.name.lowercase()} goal"
    }

    private fun generateFallbackResponse(
        userMessage: String,
        events: List<Event>,
        rules: List<Rule>,
        categories: List<Category>
    ): String {
        // Simple rule-based responses when LLM is not available
        val lower = userMessage.lowercase()
        return when {
            "today" in lower && "schedule" in lower -> {
                val today = events.filter {
                    it.startTime.toLocalDate() == LocalDateTime.now().toLocalDate()
                }.sortedBy { it.startTime }
                if (today.isEmpty()) "You have no events scheduled for today."
                else "Today you have ${today.size} event(s):\n" + today.joinToString("\n") {
                    "• ${it.startTime.hour}:${"%02d".format(it.startTime.minute)} - ${it.title}"
                }
            }
            "upcoming" in lower || "next" in lower -> {
                val upcoming = events.filter { it.startTime >= LocalDateTime.now() }
                    .sortedBy { it.startTime }.take(5)
                if (upcoming.isEmpty()) "No upcoming events found."
                else "Your next ${upcoming.size} events:\n" + upcoming.joinToString("\n") {
                    "• ${it.startTime.toLocalDate()} ${it.startTime.hour}:${"%02d".format(it.startTime.minute)} - ${it.title}"
                }
            }
            "busy" in lower || "free" in lower -> {
                "AI model is not loaded. Please place a Gemma model file in the app's models directory to enable full AI functionality."
            }
            else -> {
                "AI model not loaded. I can still show you basic schedule information. To enable full AI features, please set up the Gemma model file."
            }
        }
    }

    private fun cleanAiResponse(response: String): String {
        // Remove JSON command blocks from display (they're technical)
        // Keep natural language parts
        return response
            .replace(Regex("\\{\"action\":[^}]+\\}"), "[Action executed]")
            .replace(Regex("<start_of_turn>\\w+\\n?"), "")
            .replace(Regex("<end_of_turn>\\n?"), "")
            .trim()
            .ifBlank { "Done! I've made the requested changes to your schedule." }
    }

    fun clearConversation() {
        conversationHistory.clear()
        _messages.value = emptyList()
    }

    private fun addMessage(message: ChatMessage) {
        _messages.value = _messages.value.filter { !it.isLoading } + message
    }

    private fun removeLoadingMessage() {
        _messages.value = _messages.value.filter { !it.isLoading }
    }

    companion object {
        private const val TAG = "ScheduleAiAgent"
    }
}

sealed class AgentResult {
    data class Success(
        val response: String,
        val commands: List<ScheduleCommand>,
        val executedActions: List<String>
    ) : AgentResult()

    data class Error(val message: String) : AgentResult()
}
