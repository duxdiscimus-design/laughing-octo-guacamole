package com.duxdiscimus.scheduleai.di

import android.content.Context
import androidx.room.Room
import com.duxdiscimus.scheduleai.data.db.ScheduleDatabase
import com.duxdiscimus.scheduleai.data.db.dao.CategoryDao
import com.duxdiscimus.scheduleai.data.db.dao.EventDao
import com.duxdiscimus.scheduleai.data.db.dao.RuleDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideScheduleDatabase(@ApplicationContext context: Context): ScheduleDatabase {
        return Room.databaseBuilder(
            context,
            ScheduleDatabase::class.java,
            ScheduleDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideEventDao(database: ScheduleDatabase): EventDao = database.eventDao()

    @Provides
    fun provideRuleDao(database: ScheduleDatabase): RuleDao = database.ruleDao()

    @Provides
    fun provideCategoryDao(database: ScheduleDatabase): CategoryDao = database.categoryDao()
}
