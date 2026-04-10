package com.duxdiscimus.scheduleai.ui.screens.rules

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.duxdiscimus.scheduleai.domain.model.Rule
import com.duxdiscimus.scheduleai.domain.model.RuleType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RulesScreen(
    onNavigateBack: () -> Unit,
    viewModel: RulesViewModel = hiltViewModel()
) {
    val rules by viewModel.rules.collectAsState()
    val showAddDialog by viewModel.showAddRuleDialog.collectAsState()
    val editingRule by viewModel.editingRule.collectAsState()
    var ruleToDelete by remember { mutableStateOf<Rule?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Schedule Rules", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (rules.isEmpty()) {
                        TextButton(onClick = viewModel::addDefaultRules) {
                            Text("Add Defaults")
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = viewModel::showAddDialog) {
                Icon(Icons.Default.Add, "Add Rule")
            }
        }
    ) { padding ->
        if (rules.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.padding(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.Rule,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Text(
                        "No Rules Yet",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Rules help the AI optimize your schedule. Add rules to define working hours, focus time, and more.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Button(onClick = viewModel::addDefaultRules) {
                        Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Add Smart Defaults")
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    Text(
                        "${rules.count { it.isEnabled }}/${rules.size} rules active",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
                items(rules, key = { it.id }) { rule ->
                    RuleCard(
                        rule = rule,
                        onToggle = { viewModel.toggleRule(rule.id, it) },
                        onEdit = { viewModel.showEditDialog(rule) },
                        onDelete = { ruleToDelete = rule }
                    )
                }
                item { Spacer(Modifier.height(80.dp)) }
            }
        }
    }

    // Add/Edit dialog
    if (showAddDialog) {
        RuleDialog(
            editingRule = editingRule,
            onDismiss = viewModel::dismissDialog,
            onSave = viewModel::saveRule
        )
    }

    // Delete confirmation
    ruleToDelete?.let { rule ->
        AlertDialog(
            onDismissRequest = { ruleToDelete = null },
            title = { Text("Delete Rule") },
            text = { Text("Delete rule \"${rule.name}\"?") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteRule(rule)
                    ruleToDelete = null
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { ruleToDelete = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
fun RuleCard(
    rule: Rule,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (rule.isEnabled)
                MaterialTheme.colorScheme.surface
            else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rule type icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .padding(4.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = when (rule.type) {
                        RuleType.WORK_HOURS -> Icons.Outlined.BusinessCenter
                        RuleType.NO_MEETINGS -> Icons.Outlined.Block
                        RuleType.FOCUS_TIME -> Icons.Outlined.CenterFocusStrong
                        RuleType.BREAK_REQUIRED -> Icons.Outlined.FreeBreakfast
                        RuleType.MAX_EVENTS_PER_DAY -> Icons.Outlined.EventBusy
                        RuleType.CATEGORY_RESTRICTION -> Icons.Outlined.Category
                        RuleType.BUFFER_TIME -> Icons.Outlined.Timelapse
                        RuleType.MORNING_ROUTINE -> Icons.Outlined.WbSunny
                        RuleType.EVENING_WIND_DOWN -> Icons.Outlined.NightlightRound
                    },
                    contentDescription = null,
                    tint = if (rule.isEnabled)
                        MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                )
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = rule.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = if (rule.isEnabled) MaterialTheme.colorScheme.onSurface
                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                Text(
                    text = rule.type.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (rule.description.isNotBlank()) {
                    Text(
                        text = rule.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Actions
            Switch(
                checked = rule.isEnabled,
                onCheckedChange = onToggle
            )
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, "Edit", modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, "Delete",
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
fun RuleDialog(
    editingRule: Rule?,
    onDismiss: () -> Unit,
    onSave: (String, RuleType, String, Map<String, String>, Boolean) -> Unit
) {
    var name by remember { mutableStateOf(editingRule?.name ?: "") }
    var selectedType by remember { mutableStateOf(editingRule?.type ?: RuleType.WORK_HOURS) }
    var description by remember { mutableStateOf(editingRule?.description ?: "") }
    var enabled by remember { mutableStateOf(editingRule?.isEnabled ?: true) }
    var startTime by remember { mutableStateOf(editingRule?.parameters?.get("startTime") ?: "09:00") }
    var endTime by remember { mutableStateOf(editingRule?.parameters?.get("endTime") ?: "18:00") }
    var maxEvents by remember { mutableStateOf(editingRule?.parameters?.get("maxEventsPerDay") ?: "8") }
    var breakMinutes by remember { mutableStateOf(editingRule?.parameters?.get("requiredBreakMinutes") ?: "15") }
    var typeExpanded by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editingRule != null) "Edit Rule" else "Add Rule") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it; nameError = false },
                    label = { Text("Rule Name *") },
                    isError = nameError,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { typeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedType.label,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Rule Type") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(typeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = typeExpanded,
                        onDismissRequest = { typeExpanded = false }
                    ) {
                        RuleType.entries.forEach { type ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(type.label, fontWeight = FontWeight.Medium)
                                        Text(type.description,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                },
                                onClick = {
                                    selectedType = type
                                    typeExpanded = false
                                }
                            )
                        }
                    }
                }

                // Contextual parameters
                when (selectedType) {
                    RuleType.WORK_HOURS, RuleType.NO_MEETINGS, RuleType.FOCUS_TIME,
                    RuleType.MORNING_ROUTINE, RuleType.EVENING_WIND_DOWN -> {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = startTime,
                                onValueChange = { startTime = it },
                                label = { Text("Start (HH:mm)") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = endTime,
                                onValueChange = { endTime = it },
                                label = { Text("End (HH:mm)") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }
                    }
                    RuleType.MAX_EVENTS_PER_DAY -> {
                        OutlinedTextField(
                            value = maxEvents,
                            onValueChange = { maxEvents = it },
                            label = { Text("Max Events Per Day") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    RuleType.BREAK_REQUIRED, RuleType.BUFFER_TIME -> {
                        OutlinedTextField(
                            value = breakMinutes,
                            onValueChange = { breakMinutes = it },
                            label = { Text("Minutes Required") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                    else -> {}
                }

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Enabled", modifier = Modifier.weight(1f))
                    Switch(checked = enabled, onCheckedChange = { enabled = it })
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                if (name.isBlank()) {
                    nameError = true
                    return@TextButton
                }
                val params = buildMap<String, String> {
                    when (selectedType) {
                        RuleType.WORK_HOURS, RuleType.NO_MEETINGS, RuleType.FOCUS_TIME,
                        RuleType.MORNING_ROUTINE, RuleType.EVENING_WIND_DOWN -> {
                            if (startTime.isNotBlank()) put("startTime", startTime)
                            if (endTime.isNotBlank()) put("endTime", endTime)
                        }
                        RuleType.MAX_EVENTS_PER_DAY -> {
                            if (maxEvents.isNotBlank()) put("maxEventsPerDay", maxEvents)
                        }
                        RuleType.BREAK_REQUIRED, RuleType.BUFFER_TIME -> {
                            if (breakMinutes.isNotBlank()) put("requiredBreakMinutes", breakMinutes)
                        }
                        else -> {}
                    }
                }
                onSave(name, selectedType, description, params, enabled)
            }) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
