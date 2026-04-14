package com.duxdiscimus.scheduleai.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.duxdiscimus.scheduleai.domain.model.Rule
import com.duxdiscimus.scheduleai.domain.model.RuleType

@Entity(tableName = "rules")
data class RuleEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val description: String = "",
    val type: String,
    val isEnabled: Boolean = true,
    val priority: Int = 0,
    val parametersJson: String = "{}"
) {
    fun toDomain(): Rule {
        val params = try {
            com.google.gson.Gson().fromJson(
                parametersJson,
                object : com.google.gson.reflect.TypeToken<Map<String, String>>() {}.type
            ) ?: emptyMap<String, String>()
        } catch (e: Exception) {
            emptyMap()
        }
        return Rule(
            id = id,
            name = name,
            description = description,
            type = RuleType.valueOf(type),
            isEnabled = isEnabled,
            priority = priority,
            parameters = params
        )
    }

    companion object {
        fun fromDomain(rule: Rule): RuleEntity {
            val gson = com.google.gson.Gson()
            return RuleEntity(
                id = rule.id,
                name = rule.name,
                description = rule.description,
                type = rule.type.name,
                isEnabled = rule.isEnabled,
                priority = rule.priority,
                parametersJson = gson.toJson(rule.parameters)
            )
        }
    }
}
