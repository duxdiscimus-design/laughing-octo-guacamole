package com.duxdiscimus.scheduleai.data.db

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.duxdiscimus.scheduleai.data.db.dao.CategoryDao
import com.duxdiscimus.scheduleai.data.db.dao.EventDao
import com.duxdiscimus.scheduleai.data.db.dao.RuleDao
import com.duxdiscimus.scheduleai.data.db.entities.CategoryEntity
import com.duxdiscimus.scheduleai.data.db.entities.EventEntity
import com.duxdiscimus.scheduleai.data.db.entities.RuleEntity

@Database(
    entities = [EventEntity::class, RuleEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = true
)
abstract class ScheduleDatabase : RoomDatabase() {
    abstract fun eventDao(): EventDao
    abstract fun ruleDao(): RuleDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        const val DATABASE_NAME = "schedule_ai.db"
    }
}
