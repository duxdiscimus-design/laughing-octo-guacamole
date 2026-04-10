package com.duxdiscimus.scheduleai

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class ScheduleAiApplication : Application() {

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Inject
    lateinit var categoryRepository: com.duxdiscimus.scheduleai.data.repository.CategoryRepository

    override fun onCreate() {
        super.onCreate()
        applicationScope.launch {
            // Initialize default categories on first launch
            categoryRepository.initializeDefaults()
        }
    }
}
