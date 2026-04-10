package com.duxdiscimus.scheduleai.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class AlarmReceiver : BroadcastReceiver() {

    @Inject
    lateinit var notificationManager: NotificationManager

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_REMINDER -> {
                val eventId = intent.getLongExtra(EXTRA_EVENT_ID, -1)
                val title = intent.getStringExtra(EXTRA_EVENT_TITLE) ?: "Event"
                val minutesBefore = intent.getIntExtra(EXTRA_REMINDER_MINUTES, 15)

                if (eventId != -1L) {
                    notificationManager.showEventReminderNotification(eventId, title, minutesBefore)
                }
            }
        }
    }

    companion object {
        const val ACTION_REMINDER = "com.duxdiscimus.scheduleai.ACTION_REMINDER"
        const val EXTRA_EVENT_ID = "event_id"
        const val EXTRA_EVENT_TITLE = "event_title"
        const val EXTRA_REMINDER_MINUTES = "reminder_minutes"
    }
}
