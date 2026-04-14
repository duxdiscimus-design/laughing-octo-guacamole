# ProGuard rules for ScheduleAI

# MediaPipe
-keep class com.google.mediapipe.** { *; }
-keep class com.google.flatbuffers.** { *; }

# Hilt
-keep class dagger.hilt.** { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# Serialization
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# DataStore
-keep class androidx.datastore.** { *; }

# Kotlin
-dontwarn kotlin.**
-keep class kotlin.** { *; }
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# Keep app model classes for serialization
-keep class com.duxdiscimus.scheduleai.domain.model.** { *; }
-keep class com.duxdiscimus.scheduleai.data.db.entities.** { *; }
-keep class com.duxdiscimus.scheduleai.ai.** { *; }
