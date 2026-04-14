# ScheduleAI — Intelligent Schedule Manager with On-Device AI

A fully-featured Android schedule app with an integrated **on-device AI assistant** powered by **Google's Gemma 3** via the MediaPipe LLM Inference API. Optimized for **Google Pixel 10 Pro**.

## ✨ Features

### 📅 Schedule Management
- **Week, Month, and Agenda views** with smooth navigation
- **Full event CRUD** — create, edit, delete events with rich details
- **Categories & colors** — 7 built-in categories (Work, Personal, Health, Social, Education, Travel, Other)
- **Priority levels** — Low, Medium, High, Urgent with visual indicators
- **Recurrence** — Daily, Weekdays, Weekly, Monthly
- **Reminders** — Configurable alarm-based notifications
- **Location tracking** per event
- **Full-text search** across events
- **Event completion tracking**

### 🤖 On-Device AI Assistant (Gemma 3)
- **Natural language schedule control** — "Add a meeting tomorrow at 2 PM"
- **Full schedule access** — AI can see all events, categories, and rules
- **Execute commands** — Creates, edits, moves, and deletes events via JSON commands
- **Schedule optimization** — Optimizes for productivity, wellness, balance, or focus time
- **Conflict detection** — Automatically identifies scheduling conflicts
- **Streaming responses** — Real-time token-by-token output with animated indicator
- **Conversation history** — Context-aware multi-turn conversation
- **Smart suggestions** — Quick-tap example prompts
- **Works offline** — Completely on-device, no internet required

### 📋 Rules Engine
- **9 rule types**: Working Hours, No-Meeting Blocks, Focus Time, Break Required, Event Limit, Category Restriction, Buffer Time, Morning Routine, Evening Wind-Down
- **Enable/disable rules** individually
- **AI-aware rules** — The AI uses rules when optimizing schedules
- **Smart defaults** — One-tap setup of recommended productivity rules

### ⚙️ Settings
- **Material You** dynamic color (Pixel 10 Pro wallpaper-based themes)
- **Dark/Light theme** support
- **Configurable work hours**
- **AI model management** with status indicators
- **Notification preferences**

## 🏗️ Architecture

```
com.duxdiscimus.scheduleai/
├── data/
│   ├── db/           # Room database, entities, DAOs
│   └── repository/   # Data repositories
├── domain/
│   └── model/        # Event, Rule, Category models
├── ai/               # Gemma LLM integration (MediaPipe)
│   ├── LlmInferenceManager.kt  # Model loading & inference
│   ├── ScheduleAiAgent.kt      # Main AI coordinator
│   ├── ScheduleCommand.kt      # Structured command parsing
│   └── SchedulePromptBuilder.kt # System prompts & context
├── ui/
│   ├── screens/      # Compose screens + ViewModels
│   ├── navigation/   # NavHost routing
│   ├── theme/        # Material 3 theme
│   └── components/   # Reusable Compose components
├── notifications/    # AlarmManager + BroadcastReceivers
└── di/               # Hilt DI modules
```

**Tech Stack:**
- Kotlin + Jetpack Compose (Material 3)
- Hilt (Dependency Injection)
- Room (Local database)
- DataStore Preferences
- Navigation Compose
- MediaPipe LLM Inference API (Gemma 3)
- WorkManager (Background tasks)
- Coroutines + Flow

## 🚀 Building the APK

### Prerequisites
- Android Studio Meerkat (or newer) or the Android SDK
- Java 17+
- Internet connection (for Gradle dependencies)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/duxdiscimus-design/laughing-octo-guacamole.git
cd laughing-octo-guacamole

# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# APK output location:
# app/build/outputs/apk/debug/app-debug.apk
# app/build/outputs/apk/release/app-release-unsigned.apk
```

### Sign Release APK
```bash
# Generate keystore (first time)
keytool -genkey -v -keystore scheduleai.jks -alias scheduleai -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore scheduleai.jks \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  scheduleai

# Zipalign
zipalign -v 4 \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  app-release.apk
```

## 🧠 Setting Up the Gemma AI Model

The AI assistant uses **Gemma 3** from Google running **100% on-device** via MediaPipe LLM Inference.

### Step 1: Download the Gemma Model

1. Go to [Kaggle Models - Google Gemma](https://www.kaggle.com/models/google/gemma)
2. Select **Gemma 3** → **1B-it** or **4B-it** → **LiteRT** format
3. Download the INT4 quantized model file

| Model | Size | Quality | Recommended For |
|-------|------|---------|-----------------|
| `gemma3-1b-it-int4.bin` | ~0.9 GB | Good | Quick responses |
| `gemma3-4b-it-int4.bin` | ~2.5 GB | Excellent | **Pixel 10 Pro (recommended)** |

### Step 2: Install the Model

Transfer the model file to the device:

```bash
# Via ADB
adb push gemma3-4b-it-int4.bin \
  /sdcard/Android/data/com.duxdiscimus.scheduleai/files/models/

# Or via Files app: navigate to
# Internal Storage → Android → data → com.duxdiscimus.scheduleai → files → models
```

### Step 3: Initialize
Open the app → **AI Assistant** tab → the model will auto-detect and load.

## 📱 Pixel 10 Pro Optimization

- GPU acceleration via Vulkan (when supported)
- Optimized for Tensor chip inference
- Material You dynamic theming
- Edge-to-edge display support
- Predictive back gestures

## 🎯 AI Assistant Examples

| Say... | Action |
|--------|--------|
| "What's on my schedule today?" | Shows today's events |
| "Add a team standup tomorrow at 9 AM for 30 minutes" | Creates event |
| "Move my 3 PM meeting to Thursday" | Moves event |
| "Optimize my week for productivity" | Reorders events by priority |
| "Block focus time every morning 9-11 AM" | Creates focus time rule |
| "How many meetings do I have this week?" | Analyzes schedule |
| "Delete all events on Friday" | Removes events |
| "Set up working hours 9 AM to 6 PM weekdays" | Creates work hours rule |
| "What conflicts do I have?" | Detects overlapping events |

## 🔒 Privacy

All AI inference runs **100% on-device**. No data leaves your phone. The Gemma model processes your schedule data locally without any network requests.

## 📄 License

MIT License — See LICENSE file for details.
