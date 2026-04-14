package com.duxdiscimus.scheduleai.ui.screens.rules

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.duxdiscimus.scheduleai.data.repository.RuleRepository
import com.duxdiscimus.scheduleai.domain.model.Rule
import com.duxdiscimus.scheduleai.domain.model.RuleType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RulesViewModel @Inject constructor(
    private val ruleRepository: RuleRepository
) : ViewModel() {

    val rules: StateFlow<List<Rule>> = ruleRepository.getAllRules()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _showAddRuleDialog = MutableStateFlow(false)
    val showAddRuleDialog: StateFlow<Boolean> = _showAddRuleDialog.asStateFlow()

    private val _editingRule = MutableStateFlow<Rule?>(null)
    val editingRule: StateFlow<Rule?> = _editingRule.asStateFlow()

    fun toggleRule(ruleId: Long, enabled: Boolean) {
        viewModelScope.launch {
            ruleRepository.setRuleEnabled(ruleId, enabled)
        }
    }

    fun deleteRule(rule: Rule) {
        viewModelScope.launch {
            ruleRepository.deleteRule(rule)
        }
    }

    fun showAddDialog() {
        _editingRule.value = null
        _showAddRuleDialog.value = true
    }

    fun showEditDialog(rule: Rule) {
        _editingRule.value = rule
        _showAddRuleDialog.value = true
    }

    fun dismissDialog() {
        _showAddRuleDialog.value = false
        _editingRule.value = null
    }

    fun saveRule(
        name: String,
        type: RuleType,
        description: String,
        parameters: Map<String, String>,
        enabled: Boolean
    ) {
        viewModelScope.launch {
            val existingRule = _editingRule.value
            val rule = Rule(
                id = existingRule?.id ?: 0,
                name = name,
                type = type,
                description = description,
                parameters = parameters,
                isEnabled = enabled,
                priority = existingRule?.priority ?: 0
            )
            if (existingRule != null) {
                ruleRepository.updateRule(rule)
            } else {
                ruleRepository.saveRule(rule)
            }
            dismissDialog()
        }
    }

    fun addDefaultRules() {
        viewModelScope.launch {
            val defaultRules = listOf(
                Rule(
                    name = "Working Hours",
                    type = RuleType.WORK_HOURS,
                    description = "Only schedule work events 9AM-6PM on weekdays",
                    parameters = mapOf(
                        "startTime" to "09:00",
                        "endTime" to "18:00",
                        "daysOfWeek" to "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
                    ),
                    priority = 10
                ),
                Rule(
                    name = "Focus Time",
                    type = RuleType.FOCUS_TIME,
                    description = "Reserve 9-11 AM for deep work",
                    parameters = mapOf(
                        "startTime" to "09:00",
                        "endTime" to "11:00",
                        "daysOfWeek" to "MONDAY,TUESDAY,WEDNESDAY,THURSDAY"
                    ),
                    priority = 8
                ),
                Rule(
                    name = "Break Required",
                    type = RuleType.BREAK_REQUIRED,
                    description = "Require 15-minute breaks between events",
                    parameters = mapOf("requiredBreakMinutes" to "15"),
                    priority = 6
                ),
                Rule(
                    name = "Max 8 Events/Day",
                    type = RuleType.MAX_EVENTS_PER_DAY,
                    description = "Limit to 8 events per day to prevent burnout",
                    parameters = mapOf("maxEventsPerDay" to "8"),
                    priority = 5
                ),
                Rule(
                    name = "Evening Wind-Down",
                    type = RuleType.EVENING_WIND_DOWN,
                    description = "Keep 8-10 PM free for relaxation",
                    parameters = mapOf(
                        "startTime" to "20:00",
                        "endTime" to "22:00"
                    ),
                    priority = 4
                )
            )
            defaultRules.forEach { ruleRepository.saveRule(it) }
        }
    }
}
