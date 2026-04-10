package com.duxdiscimus.scheduleai.data.repository

import com.duxdiscimus.scheduleai.data.db.dao.CategoryDao
import com.duxdiscimus.scheduleai.data.db.dao.EventDao
import com.duxdiscimus.scheduleai.data.db.entities.EventEntity
import com.duxdiscimus.scheduleai.domain.model.Event
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.LocalDateTime
import java.time.ZoneOffset
import javax.inject.Inject
import javax.inject.Singleton
@Singleton
class EventRepository @Inject constructor(
    private val eventDao: EventDao,
    private val categoryDao: CategoryDao
) {

    fun getAllEvents(): Flow<List<Event>> {
        return combine(
            eventDao.getAllEvents(),
            categoryDao.getAllCategories()
        ) { events, categories ->
            val categoryMap = categories.associate { it.id to Pair(it.name, it.color) }
            events.map { entity ->
                val (catName, catColor) = categoryMap[entity.categoryId] ?: Pair("Other", 0xFF90A4AE.toInt())
                entity.toDomain(catName, catColor)
            }
        }
    }

    fun getEventsBetween(start: LocalDateTime, end: LocalDateTime): Flow<List<Event>> {
        return combine(
            eventDao.getEventsBetween(
                start.toEpochSecond(ZoneOffset.UTC),
                end.toEpochSecond(ZoneOffset.UTC)
            ),
            categoryDao.getAllCategories()
        ) { events, categories ->
            val categoryMap = categories.associate { it.id to Pair(it.name, it.color) }
            events.map { entity ->
                val (catName, catColor) = categoryMap[entity.categoryId] ?: Pair("Other", 0xFF90A4AE.toInt())
                entity.toDomain(catName, catColor)
            }
        }
    }

    fun getUpcomingEvents(from: LocalDateTime = LocalDateTime.now()): Flow<List<Event>> {
        return combine(
            eventDao.getUpcomingEvents(from.toEpochSecond(ZoneOffset.UTC)),
            categoryDao.getAllCategories()
        ) { events, categories ->
            val categoryMap = categories.associate { it.id to Pair(it.name, it.color) }
            events.map { entity ->
                val (catName, catColor) = categoryMap[entity.categoryId] ?: Pair("Other", 0xFF90A4AE.toInt())
                entity.toDomain(catName, catColor)
            }
        }
    }

    fun searchEvents(query: String): Flow<List<Event>> {
        return combine(
            eventDao.searchEvents(query),
            categoryDao.getAllCategories()
        ) { events, categories ->
            val categoryMap = categories.associate { it.id to Pair(it.name, it.color) }
            events.map { entity ->
                val (catName, catColor) = categoryMap[entity.categoryId] ?: Pair("Other", 0xFF90A4AE.toInt())
                entity.toDomain(catName, catColor)
            }
        }
    }

    suspend fun getEventById(id: Long): Event? {
        val entity = eventDao.getEventById(id) ?: return null
        val category = categoryDao.getCategoryById(entity.categoryId)
        return entity.toDomain(
            categoryName = category?.name ?: "Other",
            categoryColor = category?.color ?: 0xFF90A4AE.toInt()
        )
    }

    suspend fun saveEvent(event: Event): Long {
        val entity = EventEntity.fromDomain(event)
        return eventDao.insertEvent(entity)
    }

    suspend fun saveEvents(events: List<Event>) {
        eventDao.insertEvents(events.map { EventEntity.fromDomain(it) })
    }

    suspend fun updateEvent(event: Event) {
        eventDao.updateEvent(EventEntity.fromDomain(event))
    }

    suspend fun deleteEvent(event: Event) {
        eventDao.deleteEvent(EventEntity.fromDomain(event))
    }

    suspend fun deleteEventById(id: Long) {
        eventDao.deleteEventById(id)
    }

    suspend fun setEventCompleted(id: Long, completed: Boolean) {
        eventDao.setEventCompleted(id, completed)
    }

    suspend fun getEventsForDay(date: LocalDateTime): List<Event> {
        val dayStart = date.toLocalDate().atStartOfDay().toEpochSecond(ZoneOffset.UTC)
        val dayEnd = date.toLocalDate().plusDays(1).atStartOfDay().toEpochSecond(ZoneOffset.UTC)
        return eventDao.getEventsForDay(dayStart, dayEnd).map { entity ->
            val category = categoryDao.getCategoryById(entity.categoryId)
            entity.toDomain(
                categoryName = category?.name ?: "Other",
                categoryColor = category?.color ?: 0xFF90A4AE.toInt()
            )
        }
    }
}
