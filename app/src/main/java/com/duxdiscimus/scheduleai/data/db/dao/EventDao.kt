package com.duxdiscimus.scheduleai.data.db.dao

import androidx.room.*
import com.duxdiscimus.scheduleai.data.db.entities.EventEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {

    @Query("SELECT * FROM events ORDER BY startTimeEpoch ASC")
    fun getAllEvents(): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE startTimeEpoch >= :startEpoch AND startTimeEpoch < :endEpoch ORDER BY startTimeEpoch ASC")
    fun getEventsBetween(startEpoch: Long, endEpoch: Long): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE startTimeEpoch >= :fromEpoch ORDER BY startTimeEpoch ASC")
    fun getUpcomingEvents(fromEpoch: Long): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE id = :id")
    suspend fun getEventById(id: Long): EventEntity?

    @Query("SELECT * FROM events WHERE categoryId = :categoryId ORDER BY startTimeEpoch ASC")
    fun getEventsByCategory(categoryId: Long): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE isCompleted = 0 ORDER BY startTimeEpoch ASC")
    fun getPendingEvents(): Flow<List<EventEntity>>

    @Query("SELECT * FROM events WHERE title LIKE '%' || :query || '%' OR description LIKE '%' || :query || '%' OR location LIKE '%' || :query || '%' ORDER BY startTimeEpoch DESC")
    fun searchEvents(query: String): Flow<List<EventEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: EventEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvents(events: List<EventEntity>)

    @Update
    suspend fun updateEvent(event: EventEntity)

    @Delete
    suspend fun deleteEvent(event: EventEntity)

    @Query("DELETE FROM events WHERE id = :id")
    suspend fun deleteEventById(id: Long)

    @Query("DELETE FROM events WHERE parentEventId = :parentId")
    suspend fun deleteRecurrenceChildren(parentId: Long)

    @Query("UPDATE events SET isCompleted = :completed WHERE id = :id")
    suspend fun setEventCompleted(id: Long, completed: Boolean)

    @Query("SELECT COUNT(*) FROM events WHERE startTimeEpoch >= :startEpoch AND startTimeEpoch < :endEpoch")
    suspend fun getEventCountBetween(startEpoch: Long, endEpoch: Long): Int

    @Query("SELECT * FROM events WHERE startTimeEpoch >= :dayStart AND startTimeEpoch < :dayEnd ORDER BY startTimeEpoch ASC")
    suspend fun getEventsForDay(dayStart: Long, dayEnd: Long): List<EventEntity>
}
