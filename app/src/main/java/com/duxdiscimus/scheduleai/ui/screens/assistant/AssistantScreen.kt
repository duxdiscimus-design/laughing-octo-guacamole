package com.duxdiscimus.scheduleai.ui.screens.assistant

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.duxdiscimus.scheduleai.ai.ChatMessage
import com.duxdiscimus.scheduleai.ai.LlmState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssistantScreen(
    onNavigateBack: () -> Unit,
    viewModel: AssistantViewModel = hiltViewModel()
) {
    val messages by viewModel.messages.collectAsState()
    val isGenerating by viewModel.isGenerating.collectAsState()
    val llmState by viewModel.llmState.collectAsState()
    val partialResponse by viewModel.partialResponse.collectAsState()
    val lastError by viewModel.lastError.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // Scroll to bottom when new message arrives
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.AutoAwesome,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                "AI Schedule Assistant",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = when (val state = llmState) {
                                    is LlmState.Ready -> "Gemma • ${state.modelName}"
                                    is LlmState.Loading -> "Loading model…"
                                    is LlmState.ModelNotFound -> "Model not found"
                                    is LlmState.Error -> "Error"
                                    else -> "Initializing…"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = when (llmState) {
                                    is LlmState.Ready -> MaterialTheme.colorScheme.primary
                                    is LlmState.ModelNotFound -> MaterialTheme.colorScheme.error
                                    is LlmState.Error -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                }
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::clearConversation) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Clear chat")
                    }
                }
            )
        },
        bottomBar = {
            ChatInputBar(
                text = inputText,
                onTextChanged = { inputText = it },
                onSend = {
                    if (inputText.isNotBlank()) {
                        viewModel.sendMessage(inputText)
                        inputText = ""
                    }
                },
                isEnabled = !isGenerating,
                modifier = Modifier
                    .navigationBarsPadding()
                    .imePadding()
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Model status banner
            when (val state = llmState) {
                is LlmState.ModelNotFound -> {
                    ModelNotFoundBanner(
                        onRetry = viewModel::retryInitialization
                    )
                }
                is LlmState.Loading -> {
                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                    Text(
                        "Loading Gemma model…",
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                is LlmState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Row(modifier = Modifier.padding(12.dp)) {
                            Icon(Icons.Default.Error, null,
                                tint = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.width(8.dp))
                            Text(state.message, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                else -> {}
            }

            // Messages
            if (messages.isEmpty()) {
                WelcomeContent(
                    modifier = Modifier.weight(1f),
                    onSuggestionClick = {
                        viewModel.sendMessage(it)
                    }
                )
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    reverseLayout = false
                ) {
                    items(messages, key = { it.timestamp }) { message ->
                        if (message.isLoading) {
                            LoadingMessageBubble()
                        } else {
                            ChatMessageBubble(message = message)
                        }
                    }
                    // Show partial streaming response
                    if (partialResponse.isNotBlank()) {
                        item {
                            ChatMessageBubble(
                                message = ChatMessage(
                                    content = partialResponse,
                                    isUser = false,
                                    isLoading = false
                                ),
                                isStreaming = true
                            )
                        }
                    }
                }
            }

            // Error snackbar
            lastError?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::dismissError) { Text("Dismiss") }
                    }
                ) { Text(error) }
            }
        }
    }
}

@Composable
fun ChatMessageBubble(
    message: ChatMessage,
    isStreaming: Boolean = false,
    modifier: Modifier = Modifier
) {
    val isUser = message.isUser
    val bubbleColor = if (isUser) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }
    val textColor = if (isUser) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(Modifier.width(8.dp))
        }

        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Box(
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = if (isUser) 16.dp else 4.dp,
                            topEnd = if (isUser) 4.dp else 16.dp,
                            bottomStart = 16.dp,
                            bottomEnd = 16.dp
                        )
                    )
                    .background(bubbleColor)
                    .padding(12.dp)
            ) {
                Column {
                    Text(
                        text = message.content + if (isStreaming) "▍" else "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = textColor
                    )
                    if (message.commands.isNotEmpty() && !isUser) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "${message.commands.size} action(s) executed",
                            style = MaterialTheme.typography.labelSmall,
                            color = textColor.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }

        if (isUser) {
            Spacer(Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}

@Composable
fun LoadingMessageBubble() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.AutoAwesome, null,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.width(8.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp, 16.dp, 16.dp, 16.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(16.dp)
        ) {
            ThinkingIndicator()
        }
    }
}

@Composable
fun ThinkingIndicator() {
    val infiniteTransition = rememberInfiniteTransition(label = "thinking")
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        repeat(3) { index ->
            val offsetY by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = -8f,
                animationSpec = infiniteRepeatable(
                    animation = tween(400, delayMillis = index * 100),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "dot$index"
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .offset(y = offsetY.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
            )
        }
    }
}

@Composable
fun ChatInputBar(
    text: String,
    onTextChanged: (String) -> Unit,
    onSend: () -> Unit,
    isEnabled: Boolean,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shadowElevation = 8.dp,
        tonalElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            OutlinedTextField(
                value = text,
                onValueChange = onTextChanged,
                modifier = Modifier.weight(1f),
                placeholder = { Text("Ask me to manage your schedule…") },
                enabled = isEnabled,
                maxLines = 4,
                shape = RoundedCornerShape(24.dp)
            )
            Spacer(Modifier.width(8.dp))
            FloatingActionButton(
                onClick = onSend,
                modifier = Modifier.size(48.dp),
                containerColor = if (text.isNotBlank() && isEnabled)
                    MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surfaceVariant
            ) {
                if (isEnabled) {
                    Icon(Icons.Default.Send, "Send",
                        tint = if (text.isNotBlank()) MaterialTheme.colorScheme.onPrimary
                        else MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                }
            }
        }
    }
}

@Composable
fun WelcomeContent(
    onSuggestionClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val suggestions = listOf(
        "What's on my schedule today?",
        "Add a meeting tomorrow at 2 PM",
        "Optimize my week for productivity",
        "Show upcoming events",
        "Set up working hours rule 9 AM to 6 PM",
        "Block focus time every morning 9-11 AM",
        "What conflicts do I have this week?",
        "Reschedule my next meeting to afternoon"
    )

    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "Hi! I'm your AI Schedule Assistant",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Powered by Gemma – I can manage your schedule, create events, set rules, and optimize your time.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(24.dp))
        Text(
            "Try asking:",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(12.dp))
        suggestions.chunked(2).forEach { row ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                row.forEach { suggestion ->
                    SuggestionChip(
                        onClick = { onSuggestionClick(suggestion) },
                        label = { Text(suggestion, style = MaterialTheme.typography.labelMedium) },
                        modifier = Modifier.weight(1f),
                        icon = {
                            Icon(Icons.Default.AutoAwesome, null,
                                modifier = Modifier.size(16.dp))
                        }
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
            Spacer(Modifier.height(4.dp))
        }
    }
}

@Composable
fun ModelNotFoundBanner(onRetry: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.secondary
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Gemma Model Setup Required",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "To enable on-device AI, place a Gemma model file in:\n" +
                "/Android/data/com.duxdiscimus.scheduleai/files/models/\n\n" +
                "Recommended: gemma3-4b-it-int4.bin (Pixel 10 Pro)\n" +
                "Download from: kaggle.com/models/google/gemma",
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(8.dp))
            Button(onClick = onRetry, modifier = Modifier.align(Alignment.End)) {
                Icon(Icons.Default.Refresh, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Check Again")
            }
        }
    }
}
