package com.duxdiscimus.scheduleai.data.repository

import com.duxdiscimus.scheduleai.data.db.dao.RuleDao
import com.duxdiscimus.scheduleai.data.db.entities.RuleEntity
import com.duxdiscimus.scheduleai.domain.model.Rule
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RuleRepository @Inject constructor(
    private val ruleDao: RuleDao
) {

    fun getAllRules(): Flow<List<Rule>> =
        ruleDao.getAllRules().map { list -> list.map { it.toDomain() } }

    fun getEnabledRules(): Flow<List<Rule>> =
        ruleDao.getEnabledRules().map { list -> list.map { it.toDomain() } }

    suspend fun getRuleById(id: Long): Rule? =
        ruleDao.getRuleById(id)?.toDomain()

    suspend fun saveRule(rule: Rule): Long =
        ruleDao.insertRule(RuleEntity.fromDomain(rule))

    suspend fun updateRule(rule: Rule) =
        ruleDao.updateRule(RuleEntity.fromDomain(rule))

    suspend fun deleteRule(rule: Rule) =
        ruleDao.deleteRule(RuleEntity.fromDomain(rule))

    suspend fun deleteRuleById(id: Long) =
        ruleDao.deleteRuleById(id)

    suspend fun setRuleEnabled(id: Long, enabled: Boolean) =
        ruleDao.setRuleEnabled(id, enabled)
}
