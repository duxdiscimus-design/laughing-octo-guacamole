package com.duxdiscimus.scheduleai.data.db.dao

import androidx.room.*
import com.duxdiscimus.scheduleai.data.db.entities.RuleEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RuleDao {

    @Query("SELECT * FROM rules ORDER BY priority DESC, name ASC")
    fun getAllRules(): Flow<List<RuleEntity>>

    @Query("SELECT * FROM rules WHERE isEnabled = 1 ORDER BY priority DESC")
    fun getEnabledRules(): Flow<List<RuleEntity>>

    @Query("SELECT * FROM rules WHERE id = :id")
    suspend fun getRuleById(id: Long): RuleEntity?

    @Query("SELECT * FROM rules WHERE type = :type AND isEnabled = 1")
    fun getRulesByType(type: String): Flow<List<RuleEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRule(rule: RuleEntity): Long

    @Update
    suspend fun updateRule(rule: RuleEntity)

    @Delete
    suspend fun deleteRule(rule: RuleEntity)

    @Query("DELETE FROM rules WHERE id = :id")
    suspend fun deleteRuleById(id: Long)

    @Query("UPDATE rules SET isEnabled = :enabled WHERE id = :id")
    suspend fun setRuleEnabled(id: Long, enabled: Boolean)
}
