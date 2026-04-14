package com.duxdiscimus.scheduleai.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.duxdiscimus.scheduleai.data.repository.EventRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject
    lateinit var eventRepository: EventRepository

    @Inject
    lateinit var notificationManager: NotificationManager

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Log.i("BootReceiver", "Rescheduling event reminders after boot")
            // Use goAsync() to properly extend the BroadcastReceiver lifecycle for async work
            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val now = LocalDateTime.now()
                    val upcomingEvents = eventRepository.getUpcomingEvents(now).first()
                    upcomingEvents.filter { it.reminderMinutes > 0 }.forEach { event ->
                        notificationManager.scheduleEventReminder(event)
                    }
                    Log.i("BootReceiver", "Rescheduled ${upcomingEvents.size} reminders")
                } catch (e: Exception) {
                    Log.e("BootReceiver", "Failed to reschedule reminders", e)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }
}
