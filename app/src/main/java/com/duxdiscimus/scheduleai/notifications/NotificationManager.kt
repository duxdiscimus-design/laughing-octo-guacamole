package com.duxdiscimus.scheduleai.notifications

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.duxdiscimus.scheduleai.MainActivity
import com.duxdiscimus.scheduleai.R
import com.duxdiscimus.scheduleai.domain.model.Event
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDateTime
import java.time.ZoneOffset
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val notificationManager = NotificationManagerCompat.from(context)
    private val alarmManager =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val remindersChannel = NotificationChannel(
            CHANNEL_REMINDERS,
            context.getString(R.string.notification_channel_reminders),
            android.app.NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.notification_channel_reminders_desc)
            enableVibration(true)
        }

        val aiChannel = NotificationChannel(
            CHANNEL_AI,
            context.getString(R.string.notification_channel_ai),
            android.app.NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = context.getString(R.string.notification_channel_ai_desc)
        }

        (context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager)
            .createNotificationChannels(listOf(remindersChannel, aiChannel))
    }

    fun scheduleEventReminder(event: Event) {
        if (event.reminderMinutes <= 0) return

        val reminderTime = event.startTime.minusMinutes(event.reminderMinutes.toLong())
        val reminderEpochMs = reminderTime.toInstant(ZoneOffset.UTC).toEpochMilli()

        if (reminderEpochMs <= System.currentTimeMillis()) return

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_REMINDER
            putExtra(AlarmReceiver.EXTRA_EVENT_ID, event.id)
            putExtra(AlarmReceiver.EXTRA_EVENT_TITLE, event.title)
            putExtra(AlarmReceiver.EXTRA_REMINDER_MINUTES, event.reminderMinutes)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            event.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    reminderEpochMs,
                    pendingIntent
                )
            } else {
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    reminderEpochMs,
                    pendingIntent
                )
            }
        } catch (e: SecurityException) {
            // Permission not granted - fall back to inexact
            alarmManager.set(AlarmManager.RTC_WAKEUP, reminderEpochMs, pendingIntent)
        }
    }

    fun cancelEventReminder(eventId: Long) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            eventId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pendingIntent?.let { alarmManager.cancel(it) }
    }

    fun showEventReminderNotification(eventId: Long, title: String, minutesBefore: Int) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("event_id", eventId)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            eventId.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val timeText = when {
            minutesBefore < 60 -> "$minutesBefore minutes"
            minutesBefore == 60 -> "1 hour"
            else -> "${minutesBefore / 60} hours"
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.reminder_notification_title, title))
            .setContentText(context.getString(R.string.reminder_notification_text, timeText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(eventId.toInt(), notification)
    }

    fun showAiSuggestionNotification(message: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("open_assistant", true)
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            AI_NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_AI)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.ai_suggestion))
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(AI_NOTIFICATION_ID, notification)
    }

    companion object {
        const val CHANNEL_REMINDERS = "schedule_reminders"
        const val CHANNEL_AI = "ai_suggestions"
        const val AI_NOTIFICATION_ID = 9999
    }
}
