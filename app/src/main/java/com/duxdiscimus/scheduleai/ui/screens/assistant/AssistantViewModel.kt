package com.duxdiscimus.scheduleai.ui.screens.assistant

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.duxdiscimus.scheduleai.ai.AgentResult
import com.duxdiscimus.scheduleai.ai.ChatMessage
import com.duxdiscimus.scheduleai.ai.LlmState
import com.duxdiscimus.scheduleai.ai.ScheduleAiAgent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AssistantViewModel @Inject constructor(
    private val agent: ScheduleAiAgent
) : ViewModel() {

    val messages: StateFlow<List<ChatMessage>> = agent.messages
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val isGenerating: StateFlow<Boolean> = agent.isGenerating
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val llmState: StateFlow<LlmState> = agent.llmState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), LlmState.Uninitialized)

    private val _partialResponse = MutableStateFlow("")
    val partialResponse: StateFlow<String> = _partialResponse.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    init {
        initializeAgent()
    }

    private fun initializeAgent() {
        viewModelScope.launch {
            agent.initialize()
        }
    }

    fun sendMessage(message: String) {
        if (message.isBlank() || isGenerating.value) return
        _partialResponse.value = ""
        _lastError.value = null

        viewModelScope.launch {
            val result = agent.processMessage(message) { partial ->
                _partialResponse.value = partial
            }
            _partialResponse.value = ""
            if (result is AgentResult.Error) {
                _lastError.value = result.message
            }
        }
    }

    fun clearConversation() {
        agent.clearConversation()
        _partialResponse.value = ""
        _lastError.value = null
    }

    fun retryInitialization() {
        initializeAgent()
    }

    fun dismissError() {
        _lastError.value = null
    }
}
